module reco::game {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::option::{Self, Option};
    use std::vector;
    use sui::random::{Self, Random};

    // Direction constants
    const DIR_UP: u8 = 8;
    const DIR_DOWN: u8 = 2;
    const DIR_LEFT: u8 = 4;
    const DIR_RIGHT: u8 = 6;

    // Wall direction bits (each cell can have walls on 4 sides)
    const WALL_NORTH: u8 = 1;  // 0001
    const WALL_SOUTH: u8 = 2;  // 0010
    const WALL_WEST: u8 = 4;   // 0100
    const WALL_EAST: u8 = 8;   // 1000

    // Error codes
    const E_INVALID_PLAYER: u64 = 100;
    const E_INVALID_DIRECTION: u64 = 101;
    const E_GAME_ENDED: u64 = 102;
    const E_INVALID_ROUTE: u64 = 103;

    /// 게임 상태 구조체 (Ricochet Robots)
    public struct Game has key, store {
        id: UID,
        map_size: u8,
        walls: vector<u8>, // Each cell stores walls as bit flags (N=1, S=2, W=4, E=8)
        robot_positions: vector<u8>, // 4 robots positions (0~255)
        target_position: u8, // 목표 위치
        target_robot: u8, // 목표에 도달해야 하는 로봇 인덱스 (0~3)
        winner: option::Option<u8>, // 승자 플레이어 인덱스
        best_move_count: u8, // 현재까지 최고 기록
        scores: vector<u8>, // 플레이어별 점수 (최대 4명)
        submitted_routes: vector<vector<u8>>, // 플레이어별 제출 경로
    }

    /// 게임 생성 with random robot positions and random walls
    public entry fun create_game(r: &Random, ctx: &mut TxContext) {
        let mut generator = random::new_generator(r, ctx);

        // Generate random positions for robots
        let robot_positions = generate_random_robot_positions(&mut generator, 16);

        // Random target position (not on robot positions)
        let target_position = generate_random_target(&mut generator, &robot_positions, 16);

        // Generate random walls (15 L-walls + 8 edge walls)
        let walls = generate_random_board(&mut generator, target_position, 16);

        let target_robot = 0; // Orange robot must reach target
        let scores = vector[0, 0, 0, 0]; // 최대 4명 플레이어
        let submitted_routes = vector[
            vector::empty<u8>(),
            vector::empty<u8>(),
            vector::empty<u8>(),
            vector::empty<u8>()
        ];

        let game = Game {
            id: object::new(ctx),
            map_size: 16, // 16x16 board
            walls,
            robot_positions,
            target_position,
            target_robot,
            winner: option::none<u8>(),
            best_move_count: 255, // Start with max moves
            scores,
            submitted_routes,
        };

        // 게임 객체를 공유 객체로 만들기 (누구나 읽을 수 있음)
        transfer::share_object(game);
    }

    /// 로봇을 한 방향으로 슬라이딩 (벽이나 다른 로봇을 만날 때까지)
    fun slide_robot(
        positions: &vector<u8>,
        robot_idx: u8,
        direction: u8,
        walls: &vector<u8>,
        map_size: u8
    ): u8 {
        let mut current_pos = *vector::borrow(positions, (robot_idx as u64));
        let mut next_pos = current_pos;

        loop {
            let row = current_pos / map_size;
            let col = current_pos % map_size;

            // Check if we can move in the direction
            let can_move = if (direction == DIR_UP) {
                row > 0 && !has_wall(walls, current_pos, WALL_NORTH)
            } else if (direction == DIR_DOWN) {
                row < map_size - 1 && !has_wall(walls, current_pos, WALL_SOUTH)
            } else if (direction == DIR_LEFT) {
                col > 0 && !has_wall(walls, current_pos, WALL_WEST)
            } else if (direction == DIR_RIGHT) {
                col < map_size - 1 && !has_wall(walls, current_pos, WALL_EAST)
            } else {
                false
            };

            if (!can_move) break;

            // Calculate next position
            next_pos = if (direction == DIR_UP) {
                current_pos - map_size
            } else if (direction == DIR_DOWN) {
                current_pos + map_size
            } else if (direction == DIR_LEFT) {
                current_pos - 1
            } else {
                current_pos + 1
            };

            // Check if another robot is at next position
            if (is_robot_at(positions, next_pos, robot_idx)) break;

            current_pos = next_pos;
        };

        current_pos
    }

    /// Check if a wall exists in a direction
    fun has_wall(walls: &vector<u8>, pos: u8, wall_bit: u8): bool {
        let cell_walls = *vector::borrow(walls, (pos as u64));
        (cell_walls & wall_bit) != 0
    }

    /// Check if another robot is at position
    fun is_robot_at(positions: &vector<u8>, pos: u8, exclude_robot: u8): bool {
        let mut i = 0;
        let len = vector::length(positions);
        while (i < len) {
            if (i != (exclude_robot as u64)) {
                if (*vector::borrow(positions, i) == pos) {
                    return true
                }
            };
            i = i + 1;
        };
        false
    }

    /// 플레이어가 경로 제출 - route format: [robot_idx, direction, robot_idx, direction, ...]
    public entry fun submit_route(game: &mut Game, player_idx: u8, route: vector<u8>) {
        assert!(player_idx < 4, E_INVALID_PLAYER);
        assert!(option::is_none(&game.winner), E_GAME_ENDED);

        // Route must have even length (pairs of robot_idx and direction)
        let route_len = vector::length(&route);
        assert!(route_len % 2 == 0 && route_len > 0, E_INVALID_ROUTE);

        // Simulate the route
        let mut temp_positions = game.robot_positions;
        let mut i = 0;
        while (i < route_len) {
            let robot_idx = *vector::borrow(&route, i);
            let direction = *vector::borrow(&route, i + 1);

            assert!(robot_idx < 4, E_INVALID_PLAYER);
            assert!(
                direction == DIR_UP || direction == DIR_DOWN ||
                direction == DIR_LEFT || direction == DIR_RIGHT,
                E_INVALID_DIRECTION
            );

            // Slide robot
            let new_pos = slide_robot(&temp_positions, robot_idx, direction, &game.walls, game.map_size);
            *vector::borrow_mut(&mut temp_positions, (robot_idx as u64)) = new_pos;

            i = i + 2;
        };

        // Check if target robot reached target
        let target_robot_pos = *vector::borrow(&temp_positions, (game.target_robot as u64));
        if (target_robot_pos == game.target_position) {
            let move_count = (route_len / 2) as u8;

            // Update best score if this is better
            if (move_count < game.best_move_count) {
                game.best_move_count = move_count;
                game.winner = option::some(player_idx);
                let player_score = vector::borrow_mut(&mut game.scores, (player_idx as u64));
                *player_score = *player_score + 1;
            };
        };

        // Save submitted route
        let submitted_route = vector::borrow_mut(&mut game.submitted_routes, (player_idx as u64));
        *submitted_route = route;
    }

    /// 게임 상태 조회
    public fun get_game_state(game: &Game): (u8, &vector<u8>, &vector<u8>, u8, u8, &Option<u8>, u8, &vector<u8>) {
        (
            game.map_size,
            &game.walls,
            &game.robot_positions,
            game.target_position,
            game.target_robot,
            &game.winner,
            game.best_move_count,
            &game.scores
        )
    }

    /// Random board generation with 15 L-walls and 8 edge walls
    fun generate_random_board(generator: &mut random::RandomGenerator, goal_pos: u8, map_size: u8): vector<u8> {
        let mut walls = vector::empty<u8>();
        let mut i = 0;

        // Initialize all cells with no walls
        while (i < 256) {
            vector::push_back(&mut walls, 0);
            i = i + 1;
        };

        // Add border walls (all edges)
        i = 0;
        while (i < 16) {
            // Top row
            let idx = i;
            *vector::borrow_mut(&mut walls, idx) = *vector::borrow(&walls, idx) | WALL_NORTH;

            // Bottom row
            let idx = 240 + i;
            *vector::borrow_mut(&mut walls, idx) = *vector::borrow(&walls, idx) | WALL_SOUTH;

            // Left column
            let idx = i * 16;
            *vector::borrow_mut(&mut walls, idx) = *vector::borrow(&walls, idx) | WALL_WEST;

            // Right column
            let idx = i * 16 + 15;
            *vector::borrow_mut(&mut walls, idx) = *vector::borrow(&walls, idx) | WALL_EAST;

            i = i + 1;
        };

        // Add 15 random L-shaped walls
        let mut l_walls_added = 0;
        while (l_walls_added < 15) {
            // Random position (avoid edges and goal)
            let row = random::generate_u8_in_range(generator, 1, 14);
            let col = random::generate_u8_in_range(generator, 1, 14);
            let pos = (row as u64) * 16 + (col as u64);

            // Skip if goal position
            if (pos == (goal_pos as u64)) {
                continue
            };

            // Check if position already has 4 walls (fully enclosed)
            if (count_walls(&walls, pos) >= 4) {
                continue
            };

            // Random L-wall direction (0=SE, 1=SW, 2=NW, 3=NE)
            let dir = random::generate_u8_in_range(generator, 0, 3);

            add_l_wall_with_rotation(&mut walls, pos, dir);
            l_walls_added = l_walls_added + 1;
        };

        // Add 8 edge-aligned vertical walls
        let mut edge_walls_added = 0;
        while (edge_walls_added < 8) {
            // Random edge (0=left, 1=right, 2=top, 3=bottom)
            let edge = random::generate_u8_in_range(generator, 0, 3);

            if (edge == 0) {
                // Left edge: column 0, random row
                let row = random::generate_u8_in_range(generator, 1, 13);
                add_edge_wall_vertical(&mut walls, (row as u64) * 16);
            } else if (edge == 1) {
                // Right edge: column 15, random row
                let row = random::generate_u8_in_range(generator, 1, 13);
                add_edge_wall_vertical(&mut walls, (row as u64) * 16 + 15);
            } else if (edge == 2) {
                // Top edge: row 0, random column
                let col = random::generate_u8_in_range(generator, 1, 13);
                add_edge_wall_horizontal(&mut walls, (col as u64));
            } else {
                // Bottom edge: row 15, random column
                let col = random::generate_u8_in_range(generator, 1, 13);
                add_edge_wall_horizontal(&mut walls, 240 + (col as u64));
            };

            edge_walls_added = edge_walls_added + 1;
        };

        walls
    }

    /// Count how many walls a cell has
    fun count_walls(walls: &vector<u8>, pos: u64): u8 {
        let wall_bits = *vector::borrow(walls, pos);
        let mut count = 0;
        if ((wall_bits & WALL_NORTH) != 0) count = count + 1;
        if ((wall_bits & WALL_SOUTH) != 0) count = count + 1;
        if ((wall_bits & WALL_WEST) != 0) count = count + 1;
        if ((wall_bits & WALL_EAST) != 0) count = count + 1;
        count
    }

    /// Add L-shaped wall with rotation (0=SE, 1=SW, 2=NW, 3=NE)
    fun add_l_wall_with_rotation(walls: &mut vector<u8>, pos: u64, direction: u8) {
        if (direction == 0) {
            // South-East (0°)
            add_wall_between(walls, pos, WALL_SOUTH);
            add_wall_between(walls, pos, WALL_EAST);
        } else if (direction == 1) {
            // South-West (90°)
            add_wall_between(walls, pos, WALL_SOUTH);
            add_wall_between(walls, pos, WALL_WEST);
        } else if (direction == 2) {
            // North-West (180°)
            add_wall_between(walls, pos, WALL_NORTH);
            add_wall_between(walls, pos, WALL_WEST);
        } else {
            // North-East (270°)
            add_wall_between(walls, pos, WALL_NORTH);
            add_wall_between(walls, pos, WALL_EAST);
        };
    }

    /// Add vertical wall along edge (2 cells high)
    fun add_edge_wall_vertical(walls: &mut vector<u8>, pos: u64) {
        if (pos < 240) {
            add_wall_between(walls, pos, WALL_SOUTH);
        };
    }

    /// Add horizontal wall along edge (2 cells wide)
    fun add_edge_wall_horizontal(walls: &mut vector<u8>, pos: u64) {
        if ((pos % 16) < 15) {
            add_wall_between(walls, pos, WALL_EAST);
        };
    }

    /// Helper function to add wall and its opposite
    fun add_wall_between(walls: &mut vector<u8>, pos: u64, wall_dir: u8) {
        let current = *vector::borrow(walls, pos);
        *vector::borrow_mut(walls, pos) = current | wall_dir;

        // Add opposite wall to adjacent cell
        let adjacent_pos = if (wall_dir == WALL_NORTH) {
            pos - 16
        } else if (wall_dir == WALL_SOUTH) {
            pos + 16
        } else if (wall_dir == WALL_WEST) {
            pos - 1
        } else { // WALL_EAST
            pos + 1
        };

        let opposite_dir = if (wall_dir == WALL_NORTH) {
            WALL_SOUTH
        } else if (wall_dir == WALL_SOUTH) {
            WALL_NORTH
        } else if (wall_dir == WALL_WEST) {
            WALL_EAST
        } else {
            WALL_WEST
        };

        let adjacent = *vector::borrow(walls, adjacent_pos);
        *vector::borrow_mut(walls, adjacent_pos) = adjacent | opposite_dir;
    }

    /// Generate random robot positions (4 robots)
    fun generate_random_robot_positions(generator: &mut random::RandomGenerator, map_size: u8): vector<u8> {
        let mut positions = vector::empty<u8>();
        let max_pos = (map_size as u64) * (map_size as u64);

        let mut i = 0;
        while (i < 4) {
            // Generate random position
            let pos = (random::generate_u8_in_range(generator, 0, (max_pos - 1) as u8));

            // Check if position is already taken
            let mut already_taken = false;
            let mut j = 0;
            while (j < vector::length(&positions)) {
                if (*vector::borrow(&positions, j) == pos) {
                    already_taken = true;
                    break
                };
                j = j + 1;
            };

            // Only add if position is unique
            if (!already_taken) {
                vector::push_back(&mut positions, pos);
                i = i + 1;
            };
        };

        positions
    }

    /// Generate random target position (not on any robot)
    fun generate_random_target(generator: &mut random::RandomGenerator, robot_positions: &vector<u8>, map_size: u8): u8 {
        let max_pos = (map_size as u64) * (map_size as u64);

        loop {
            let pos = random::generate_u8_in_range(generator, 0, (max_pos - 1) as u8);

            // Check if position is not occupied by any robot
            let mut occupied = false;
            let mut i = 0;
            while (i < vector::length(robot_positions)) {
                if (*vector::borrow(robot_positions, i) == pos) {
                    occupied = true;
                    break
                };
                i = i + 1;
            };

            if (!occupied) {
                return pos
            };
        }
    }

}
