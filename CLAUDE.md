# ETF Canvas - Claude Code 지침

## LSP 사용 규칙
- 코드 탐색 시 반드시 LSP 도구를 우선 사용할 것
- goToDefinition: 심볼 정의 찾을 때 Grep 대신 사용
- findReferences: 참조 찾을 때 Grep 대신 사용
- hover: 타입 정보 확인할 때 사용
- incomingCalls/outgoingCalls: 호출 관계 파악할 때 사용
- LSP로 해결 안 되는 경우에만 Grep/Glob 폴백
