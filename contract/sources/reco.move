module reco::game {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// 게임 상태 구조체
    public struct Game has key {
        id: UID,
        map_size: u8,
        walls: vector<u8>, // 각 벽의 위치 (0~99)
        player_positions: vector<u8>, // 플레이어 위치 (0~99)
        token_position: u8, // 목표 토큰 위치 (0~99)
        winner: Option<u8>, // 승자 인덱스 (0 또는 1)
        scores: vector<u8>, // 플레이어별 점수
        submitted_routes: vector<vector<u8>>, // 플레이어별 제출 경로
    }

    /// 게임 생성
    public entry fun create_game(ctx: &mut TxContext) {
        let walls = generate_default_walls(); // 기본 벽 생성
        let player_positions = vector[0, 99]; // 두 플레이어 위치
        let token_position = 55; // 토큰 위치
        let scores = vector[0, 0];
        let submitted_routes = vector[vector::empty<u8>(), vector::empty<u8>()];

        let game = Game {
            id: object::new(ctx),
            map_size: 10,
            walls,
            player_positions,
            token_position,
            winner: option::none<u8>(),
            scores,
            submitted_routes,
        };

        // 게임 객체를 sender에게 전송
        transfer::transfer(game, tx_context::sender(ctx));
    }

    /// 플레이어가 경로 제출 (player_idx: 0 또는 1)
    public entry fun submit_route(game: &mut Game, player_idx: u8, route: vector<u8>) {
        assert!(player_idx < 2, 100); // 두 명만 허용
        
        // 경로 검증 로직 (실제 구현 시 추가)
        let submitted_route = vector::borrow_mut(&mut game.submitted_routes, (player_idx as u64));
        *submitted_route = route;
        
        // 승자 결정: 먼저 제출한 플레이어가 승자
        if (option::is_none(&game.winner)) {
            game.winner = option::some(player_idx);
            let player_score = vector::borrow_mut(&mut game.scores, (player_idx as u64));
            *player_score = *player_score + 1;
        }
    }

    /// 게임 상태 조회
    public fun get_game_state(game: &Game): (u8, &vector<u8>, &vector<u8>, u8, &Option<u8>, &vector<u8>) {
        (
            game.map_size, 
            &game.walls, 
            &game.player_positions, 
            game.token_position, 
            &game.winner, 
            &game.scores
        )
    }

    /// 기본 벽 생성 (고정된 패턴)
    fun generate_default_walls(): vector<u8> {
        // 실제 랜덤이 필요하면 sui::random 모듈 사용 필요
        vector[12, 15, 23, 34, 45, 56, 67, 78, 81, 88]
    }

    // === 랜덤을 사용하고 싶다면 아래와 같이 구현 ===
    // use sui::random::{Random, RandomGenerator};
    
    // public entry fun create_game_with_random(
    //     random: &Random,
    //     ctx: &mut TxContext
    // ) {
    //     let mut generator = random::new_generator(random, ctx);
    //     let walls = random_walls(&mut generator, 10);
    //     
    //     let game = Game {
    //         id: object::new(ctx),
    //         map_size: 10,
    //         walls,
    //         player_positions: vector[0, 99],
    //         token_position: 55,
    //         winner: option::none<u8>(),
    //         scores: vector[0, 0],
    //         submitted_routes: vector[vector::empty<u8>(), vector::empty<u8>()],
    //     };
    //     
    //     transfer::transfer(game, tx_context::sender(ctx));
    // }
    
    // fun random_walls(generator: &mut RandomGenerator, count: u8): vector<u8> {
    //     let mut res = vector::empty<u8>();
    //     let mut i = 0;
    //     while (i < count) {
    //         let pos = random::generate_u8_in_range(generator, 10, 89);
    //         if ((pos % 10) != 0 && (pos % 10) != 9) {
    //             vector::push_back(&mut res, pos);
    //             i = i + 1;
    //         }
    //     };
    //     res
    // }
}