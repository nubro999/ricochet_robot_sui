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

    // Wall direction bits
    const WALL_NORTH: u8 = 1;
    const WALL_SOUTH: u8 = 2;
    const WALL_WEST: u8 = 4;
    const WALL_EAST: u8 = 8;

    // Error codes
    const E_INVALID_PLAYER: u64 = 100;
    const E_INVALID_DIRECTION: u64 = 101;
    const E_GAME_ENDED: u64 = 102;
    const E_INVALID_ROUTE: u64 = 103;
    const E_GENERATION_FAILED: u64 = 104;

    // Constants for generation
    const MAX_GENERATION_ATTEMPTS: u64 = 200;
    const NUM_ROBOTS: u64 = 4;
    const NUM_L_WALLS: u64 = 15;
    const NUM_EDGE_WALLS: u64 = 8;

    /// 게임 상태 구조체
    public struct Game has key, store {
        id: UID,
        map_size: u8,
        walls: vector<u8>,
        robot_positions: vector<u8>,
        target_position: u8,
        target_robot: u8,
        winner: Option<u8>,
        best_move_count: u8,
        scores: vector<u8>,
        submitted_routes: vector<vector<u8>>,
    }

    /// 게임 생성
    entry fun create_game(r: &Random, ctx: &mut TxContext) {
        let mut generator = random::new_generator(r, ctx);

        // Generate random robot positions
        let robot_positions = generate_random_robot_positions(&mut generator, 16);

        // Generate random walls and goal position (goal is at center of an L-wall)
        let (walls, target_position) = generate_random_board(&mut generator, &robot_positions, 16);

        // Random target robot (0 = Red, 1 = Green, 2 = Blue, 3 = Yellow)
        let target_robot = random::generate_u8_in_range(&mut generator, 0, 3);

        let scores = vector[0, 0, 0, 0];
        let submitted_routes = vector[
            vector::empty<u8>(),
            vector::empty<u8>(),
            vector::empty<u8>(),
            vector::empty<u8>()
        ];

        let game = Game {
            id: object::new(ctx),
            map_size: 16,
            walls,
            robot_positions,
            target_position,
            target_robot,
            winner: option::none<u8>(),
            best_move_count: 255,
            scores,
            submitted_routes,
        };

        transfer::share_object(game);
    }

    /// 로봇 슬라이딩 (최적화)
    fun slide_robot(
        positions: &vector<u8>,
        robot_idx: u8,
        direction: u8,
        walls: &vector<u8>,
        map_size: u8
    ): u8 {
        let mut current_pos = *vector::borrow(positions, (robot_idx as u64));

        loop {
            // 다음 위치와 벽 방향 계산
            let (next_pos, wall_dir, is_valid) = get_next_move(current_pos, direction, map_size);

            // 경계를 벗어나거나 벽이 있으면 중단
            if (!is_valid || has_wall(walls, current_pos, wall_dir)) {
                break
            };

            // 다른 로봇이 있으면 중단
            if (is_robot_at(positions, next_pos, robot_idx)) {
                break
            };

            current_pos = next_pos;
        };

        current_pos
    }

    /// 다음 이동 위치와 유효성 계산
    fun get_next_move(pos: u8, direction: u8, map_size: u8): (u8, u8, bool) {
        let row = pos / map_size;
        let col = pos % map_size;

        if (direction == DIR_UP) {
            if (row == 0) {
                (pos, WALL_NORTH, false)
            } else {
                (pos - map_size, WALL_NORTH, true)
            }
        } else if (direction == DIR_DOWN) {
            if (row == map_size - 1) {
                (pos, WALL_SOUTH, false)
            } else {
                (pos + map_size, WALL_SOUTH, true)
            }
        } else if (direction == DIR_LEFT) {
            if (col == 0) {
                (pos, WALL_WEST, false)
            } else {
                (pos - 1, WALL_WEST, true)
            }
        } else { // DIR_RIGHT
            if (col == map_size - 1) {
                (pos, WALL_EAST, false)
            } else {
                (pos + 1, WALL_EAST, true)
            }
        }
    }

    /// 벽 체크
    fun has_wall(walls: &vector<u8>, pos: u8, wall_bit: u8): bool {
        let cell_walls = *vector::borrow(walls, (pos as u64));
        (cell_walls & wall_bit) != 0
    }

    /// 로봇 위치 체크
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

    /// 경로 제출 (최적화)
    public entry fun submit_route(game: &mut Game, player_idx: u8, route: vector<u8>) {
        assert!(player_idx < 4, E_INVALID_PLAYER);
        assert!(option::is_none(&game.winner), E_GAME_ENDED);

        let route_len = vector::length(&route);
        assert!(route_len % 2 == 0 && route_len > 0, E_INVALID_ROUTE);

        // 임시 위치 복사
        let mut temp_positions = game.robot_positions;
        let mut i = 0;
        let mut target_reached = false;

        while (i < route_len) {
            let robot_idx = *vector::borrow(&route, i);
            let direction = *vector::borrow(&route, i + 1);

            assert!(robot_idx < 4, E_INVALID_PLAYER);
            assert!(
                direction == DIR_UP || direction == DIR_DOWN ||
                direction == DIR_LEFT || direction == DIR_RIGHT,
                E_INVALID_DIRECTION
            );

            // 로봇 이동
            let new_pos = slide_robot(&temp_positions, robot_idx, direction, &game.walls, game.map_size);
            *vector::borrow_mut(&mut temp_positions, (robot_idx as u64)) = new_pos;

            // 조기 종료: 목표 로봇이 목표 위치 도달
            if (robot_idx == game.target_robot && new_pos == game.target_position) {
                target_reached = true;
                break
            };

            i = i + 2;
        };

        // 승리 조건 체크
        if (target_reached) {
            let move_count = ((i / 2) + 1) as u8;

            if (move_count < game.best_move_count) {
                game.best_move_count = move_count;
                game.winner = option::some(player_idx);
                let player_score = vector::borrow_mut(&mut game.scores, (player_idx as u64));
                *player_score = *player_score + 1;
            };
        };

        // 경로 저장
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

    /// 랜덤 보드 생성 - L-wall의 중심에 목표 위치 설정
    fun generate_random_board(generator: &mut random::RandomGenerator, robot_positions: &vector<u8>, map_size: u8): (vector<u8>, u8) {
        let mut walls = vector::empty<u8>();
        let mut i = 0;

        // 초기화
        while (i < 256) {
            vector::push_back(&mut walls, 0);
            i = i + 1;
        };

        // 경계 벽 추가
        add_border_walls(&mut walls, map_size);

        // 중앙에 9x9 사각형 벽 추가 (내부 검은색으로 채우기)
        add_center_square(&mut walls, map_size);

        // L자형 벽 추가 및 목표 위치 반환
        let goal_pos = add_l_walls(&mut walls, generator, robot_positions, map_size);

        // 엣지 벽 추가
        add_edge_walls(&mut walls, generator);

        (walls, goal_pos)
    }

    /// 경계 벽 추가
    fun add_border_walls(walls: &mut vector<u8>, map_size: u8) {
        let mut i = 0;
        while (i < map_size) {
            // 상단
            let idx = (i as u64);
            *vector::borrow_mut(walls, idx) = *vector::borrow(walls, idx) | WALL_NORTH;

            // 하단
            let idx = ((map_size - 1) * map_size + i) as u64;
            *vector::borrow_mut(walls, idx) = *vector::borrow(walls, idx) | WALL_SOUTH;

            // 좌측
            let idx = (i * map_size) as u64;
            *vector::borrow_mut(walls, idx) = *vector::borrow(walls, idx) | WALL_WEST;

            // 우측
            let idx = (i * map_size + (map_size - 1)) as u64;
            *vector::borrow_mut(walls, idx) = *vector::borrow(walls, idx) | WALL_EAST;

            i = i + 1;
        };
    }

    /// 중앙에 4x4 사각형 벽 추가
    fun add_center_square(walls: &mut vector<u8>, map_size: u8) {
        // 16x16 맵의 중앙은 (6,6)부터 (9,9)까지 4x4 영역
        let start = 6u8;
        let end = 10u8; // exclusive

        let mut row = start;
        while (row < end) {
            let mut col = start;
            while (col < end) {
                let pos = ((row as u64) * (map_size as u64) + (col as u64));

                // 4x4 영역의 테두리에 벽 추가
                if (row == start) {
                    add_wall_between_safe(walls, pos, WALL_NORTH, map_size);
                };
                if (row == end - 1) {
                    add_wall_between_safe(walls, pos, WALL_SOUTH, map_size);
                };
                if (col == start) {
                    add_wall_between_safe(walls, pos, WALL_WEST, map_size);
                };
                if (col == end - 1) {
                    add_wall_between_safe(walls, pos, WALL_EAST, map_size);
                };

                col = col + 1;
            };
            row = row + 1;
        };
    }

    /// 중앙 4x4 사각형 내부인지 확인
    fun is_inside_center_square(pos: u8, map_size: u8): bool {
        let row = pos / map_size;
        let col = pos % map_size;
        (row >= 6 && row < 10 && col >= 6 && col < 10)
    }

    /// L자형 벽 추가 - 첫 번째 L-wall의 중심을 목표 위치로 반환
    fun add_l_walls(walls: &mut vector<u8>, generator: &mut random::RandomGenerator, robot_positions: &vector<u8>, map_size: u8): u8 {
        let mut l_walls_added = 0;
        let mut attempts = 0;
        let mut goal_pos = 0u8;

        while (l_walls_added < NUM_L_WALLS && attempts < MAX_GENERATION_ATTEMPTS) {
            attempts = attempts + 1;

            let row = random::generate_u8_in_range(generator, 1, (map_size - 2));
            let col = random::generate_u8_in_range(generator, 1, (map_size - 2));
            let pos = ((row as u64) * (map_size as u64) + (col as u64));

            // 중앙 3x3 사각형 내부는 스킵
            if (is_inside_center_square(pos as u8, map_size)) continue;

            // 로봇 위치는 스킵
            let mut is_robot_pos = false;
            let mut i = 0;
            while (i < vector::length(robot_positions)) {
                if (*vector::borrow(robot_positions, i) == (pos as u8)) {
                    is_robot_pos = true;
                    break
                };
                i = i + 1;
            };
            if (is_robot_pos) continue;

            // 이미 벽이 많으면 스킵
            if (count_walls(walls, pos) >= 3) continue;

            // L자 벽 추가
            let dir = random::generate_u8_in_range(generator, 0, 3);
            add_l_wall_safe(walls, pos, dir, map_size);

            // 첫 번째 L-wall의 중심을 목표 위치로 설정
            if (l_walls_added == 0) {
                goal_pos = pos as u8;
            };

            l_walls_added = l_walls_added + 1;
        };

        goal_pos
    }

    /// 엣지 벽 추가 (간단한 간격 유지)
    fun add_edge_walls(walls: &mut vector<u8>, generator: &mut random::RandomGenerator) {
        let mut edge_walls_added = 0;
        let map_size_u64 = 16u64;
        let half_size = 8u8; // 16 / 2

        while (edge_walls_added < NUM_EDGE_WALLS) {
            let edge = random::generate_u8_in_range(generator, 0, 3);

            if (edge == 0) {
                // 좌측 - 수직 벽
                let grid_row = random::generate_u8_in_range(generator, 0, half_size - 2);
                let row = grid_row * 2; // 간격 유지 (0, 2, 4, 6, ...)
                let pos = (row as u64) * map_size_u64;
                add_edge_wall_vertical_safe(walls, pos);
            } else if (edge == 1) {
                // 우측 - 수직 벽
                let grid_row = random::generate_u8_in_range(generator, 0, half_size - 2);
                let row = grid_row * 2;
                let pos = (row as u64) * map_size_u64 + (map_size_u64 - 1);
                add_edge_wall_vertical_safe(walls, pos);
            } else if (edge == 2) {
                // 상단 - 수평 벽
                let grid_col = random::generate_u8_in_range(generator, 0, half_size - 2);
                let col = grid_col * 2;
                let pos = (col as u64);
                add_edge_wall_horizontal_safe(walls, pos);
            } else {
                // 하단 - 수평 벽
                let grid_col = random::generate_u8_in_range(generator, 0, half_size - 2);
                let col = grid_col * 2;
                let pos = (map_size_u64 - 1) * map_size_u64 + (col as u64);
                add_edge_wall_horizontal_safe(walls, pos);
            };

            edge_walls_added = edge_walls_added + 1;
        };
    }

    /// 벽 개수 세기
    fun count_walls(walls: &vector<u8>, pos: u64): u8 {
        let wall_bits = *vector::borrow(walls, pos);
        let mut count = 0;
        if ((wall_bits & WALL_NORTH) != 0) count = count + 1;
        if ((wall_bits & WALL_SOUTH) != 0) count = count + 1;
        if ((wall_bits & WALL_WEST) != 0) count = count + 1;
        if ((wall_bits & WALL_EAST) != 0) count = count + 1;
        count
    }

    /// L자 벽 추가 (안전)
    fun add_l_wall_safe(walls: &mut vector<u8>, pos: u64, direction: u8, map_size: u8) {
        if (direction == 0) {
            add_wall_between_safe(walls, pos, WALL_SOUTH, map_size);
            add_wall_between_safe(walls, pos, WALL_EAST, map_size);
        } else if (direction == 1) {
            add_wall_between_safe(walls, pos, WALL_SOUTH, map_size);
            add_wall_between_safe(walls, pos, WALL_WEST, map_size);
        } else if (direction == 2) {
            add_wall_between_safe(walls, pos, WALL_NORTH, map_size);
            add_wall_between_safe(walls, pos, WALL_WEST, map_size);
        } else {
            add_wall_between_safe(walls, pos, WALL_NORTH, map_size);
            add_wall_between_safe(walls, pos, WALL_EAST, map_size);
        };
    }

    /// 수직 엣지 벽 (안전)
    fun add_edge_wall_vertical_safe(walls: &mut vector<u8>, pos: u64) {
        add_wall_between_safe(walls, pos, WALL_SOUTH, 16);
    }

    /// 수평 엣지 벽 (안전)
    fun add_edge_wall_horizontal_safe(walls: &mut vector<u8>, pos: u64) {
        add_wall_between_safe(walls, pos, WALL_EAST, 16);
    }

    /// 벽 추가 (경계 체크 포함)
    fun add_wall_between_safe(walls: &mut vector<u8>, pos: u64, wall_dir: u8, map_size: u8) {
        // 현재 셀에 벽 추가
        let current = *vector::borrow(walls, pos);
        *vector::borrow_mut(walls, pos) = current | wall_dir;

        // 인접 셀 계산
        let adjacent_pos_opt = get_adjacent_position(pos, wall_dir, map_size);
        
        if (option::is_some(&adjacent_pos_opt)) {
            let adjacent_pos = *option::borrow(&adjacent_pos_opt);
            let opposite_dir = get_opposite_direction(wall_dir);
            
            let adjacent = *vector::borrow(walls, adjacent_pos);
            *vector::borrow_mut(walls, adjacent_pos) = adjacent | opposite_dir;
        };
    }

    /// 인접 위치 계산 (경계 체크)
    fun get_adjacent_position(pos: u64, wall_dir: u8, map_size: u8): Option<u64> {
        let max_pos = (map_size as u64) * (map_size as u64);

        if (wall_dir == WALL_NORTH) {
            if (pos >= (map_size as u64)) {
                option::some(pos - (map_size as u64))
            } else {
                option::none()
            }
        } else if (wall_dir == WALL_SOUTH) {
            if (pos + (map_size as u64) < max_pos) {
                option::some(pos + (map_size as u64))
            } else {
                option::none()
            }
        } else if (wall_dir == WALL_WEST) {
            if (pos % (map_size as u64) > 0) {
                option::some(pos - 1)
            } else {
                option::none()
            }
        } else { // WALL_EAST
            if ((pos + 1) % (map_size as u64) != 0) {
                option::some(pos + 1)
            } else {
                option::none()
            }
        }
    }

    /// 반대 방향 벽
    fun get_opposite_direction(wall_dir: u8): u8 {
        if (wall_dir == WALL_NORTH) WALL_SOUTH
        else if (wall_dir == WALL_SOUTH) WALL_NORTH
        else if (wall_dir == WALL_WEST) WALL_EAST
        else WALL_WEST
    }

    /// 랜덤 로봇 위치 생성 (최적화)
    fun generate_random_robot_positions(generator: &mut random::RandomGenerator, map_size: u8): vector<u8> {
        let mut positions = vector::empty<u8>();

        let mut i = 0;
        while (i < 4) {
            let pos = random::generate_u8_in_range(generator, 0, 255);

            // Skip if inside center square (4x4 area from 6,6 to 9,9)
            if (is_inside_center_square(pos, map_size)) continue;

            // Check if position is unique
            let mut is_unique = true;
            let mut j = 0;
            while (j < vector::length(&positions)) {
                if (*vector::borrow(&positions, j) == pos) {
                    is_unique = false;
                    break
                };
                j = j + 1;
            };

            if (is_unique) {
                vector::push_back(&mut positions, pos);
                i = i + 1;
            };
        };

        positions
    }

}