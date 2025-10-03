module reco::game {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::option::{Self, Option};
    use std::vector;

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

    /// 게임 생성
    public entry fun create_game(ctx: &mut TxContext) {
        let walls = generate_ricochet_board(); // Ricochet Robots 보드 생성
        let robot_positions = vector[0, 15, 240, 255]; // 4개 로봇 초기 위치 (corners)
        let target_position = 119; // 목표 위치 (center-ish)
        let target_robot = 0; // Red robot must reach target
        let scores = vector[0, 0, 0, 0]; // 최대 4명 플레이어
        let submitted_routes = vector[
            vector::empty<u8>(),
            vector::empty<u8>(),
            vector::empty<u8>(),
            vector::empty<u8>()
        ];

        let game = Game {
            id: object::new(ctx),
            map_size: 16, // Ricochet Robots uses 16x16 board
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

    /// Ricochet Robots 보드 생성 (16x16 with classic wall pattern)
    fun generate_ricochet_board(): vector<u8> {
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

        // Center barrier (2x2 blocked area) - positions 119, 120, 135, 136
        add_wall_between(&mut walls, 119, WALL_SOUTH);
        add_wall_between(&mut walls, 119, WALL_EAST);
        add_wall_between(&mut walls, 120, WALL_SOUTH);
        add_wall_between(&mut walls, 120, WALL_WEST);
        add_wall_between(&mut walls, 135, WALL_NORTH);
        add_wall_between(&mut walls, 135, WALL_EAST);
        add_wall_between(&mut walls, 136, WALL_NORTH);
        add_wall_between(&mut walls, 136, WALL_WEST);

        // Classic Ricochet Robots pattern - L-shaped walls matching reference image
        // Position formula: row * 16 + col (0-indexed)

        // Top-left quadrant (rows 1-3, cols 1-3)
        add_wall_between(&mut walls, 17, WALL_SOUTH);   // pos 17: row 1, col 1
        add_wall_between(&mut walls, 33, WALL_EAST);    // pos 33: row 2, col 1

        add_wall_between(&mut walls, 34, WALL_SOUTH);   // pos 34: row 2, col 2
        add_wall_between(&mut walls, 50, WALL_EAST);    // pos 50: row 3, col 2

        add_wall_between(&mut walls, 51, WALL_SOUTH);   // pos 51: row 3, col 3
        add_wall_between(&mut walls, 67, WALL_EAST);    // pos 67: row 4, col 3

        add_wall_between(&mut walls, 68, WALL_SOUTH);   // pos 68: row 4, col 4
        add_wall_between(&mut walls, 69, WALL_EAST);    // pos 69: row 4, col 5

        // Middle-left area (row 5-6)
        add_wall_between(&mut walls, 85, WALL_SOUTH);   // pos 85: row 5, col 5
        add_wall_between(&mut walls, 86, WALL_SOUTH);   // pos 86: row 5, col 6

        add_wall_between(&mut walls, 102, WALL_EAST);   // pos 102: row 6, col 6

        // Bottom-left quadrant (rows 9-12, cols 3-6)
        add_wall_between(&mut walls, 147, WALL_SOUTH);  // pos 147: row 9, col 3
        add_wall_between(&mut walls, 163, WALL_EAST);   // pos 163: row 10, col 3

        add_wall_between(&mut walls, 164, WALL_SOUTH);  // pos 164: row 10, col 4
        add_wall_between(&mut walls, 180, WALL_EAST);   // pos 180: row 11, col 4

        add_wall_between(&mut walls, 181, WALL_SOUTH);  // pos 181: row 11, col 5
        add_wall_between(&mut walls, 197, WALL_EAST);   // pos 197: row 12, col 5

        add_wall_between(&mut walls, 198, WALL_SOUTH);  // pos 198: row 12, col 6
        add_wall_between(&mut walls, 214, WALL_EAST);   // pos 214: row 13, col 6

        // Top-right quadrant (rows 1-3, cols 13-14)
        add_wall_between(&mut walls, 30, WALL_SOUTH);   // pos 30: row 1, col 14
        add_wall_between(&mut walls, 30, WALL_EAST);    // pos 30: row 1, col 14

        add_wall_between(&mut walls, 45, WALL_SOUTH);   // pos 45: row 2, col 13
        add_wall_between(&mut walls, 61, WALL_EAST);    // pos 61: row 3, col 13

        add_wall_between(&mut walls, 77, WALL_SOUTH);   // pos 77: row 4, col 13
        add_wall_between(&mut walls, 93, WALL_EAST);    // pos 93: row 5, col 13

        add_wall_between(&mut walls, 109, WALL_SOUTH);  // pos 109: row 6, col 13
        add_wall_between(&mut walls, 125, WALL_EAST);   // pos 125: row 7, col 13

        // Middle-right area
        add_wall_between(&mut walls, 137, WALL_SOUTH);  // pos 137: row 8, col 9
        add_wall_between(&mut walls, 138, WALL_EAST);   // pos 138: row 8, col 10

        // Bottom-right quadrant (rows 9-12, cols 12-14)
        add_wall_between(&mut walls, 156, WALL_SOUTH);  // pos 156: row 9, col 12
        add_wall_between(&mut walls, 172, WALL_EAST);   // pos 172: row 10, col 12

        add_wall_between(&mut walls, 173, WALL_SOUTH);  // pos 173: row 10, col 13
        add_wall_between(&mut walls, 189, WALL_EAST);   // pos 189: row 11, col 13

        add_wall_between(&mut walls, 205, WALL_SOUTH);  // pos 205: row 12, col 13
        add_wall_between(&mut walls, 221, WALL_EAST);   // pos 221: row 13, col 13

        add_wall_between(&mut walls, 222, WALL_SOUTH);  // pos 222: row 13, col 14
        add_wall_between(&mut walls, 222, WALL_EAST);   // pos 222: row 13, col 14

        walls
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

}