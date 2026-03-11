# 마이페이지 설계

## 개요
사용자 프로필 관리, 추가정보 입력, 공개설정, 로그아웃/회원탈퇴를 위한 마이페이지.

## 레이아웃
단일 스크롤 페이지. 섹션 순서:

1. **프로필 헤더** — 아바타 + 닉네임 + 연동 계정(카카오/네이버/Google)
2. **닉네임 설정** — 커뮤니티에서 사용. 인라인 수정
3. **추가정보 (선택)** — 이름, 전화번호(이벤트용, 정확히 입력 유도), 나이, 성별, 투자경험, 투자성향
4. **공개설정** — 나이/성별/투자경험/투자성향 공개여부 토글 (이름·전화번호는 항상 비공개)
5. **로그아웃 / 회원탈퇴** — 탈퇴 시 포트폴리오 전체 삭제
6. **제3자 정보제공 동의** — 토글 + 개인정보처리방침 링크 (맨 아래, 눈에 덜 띄게)

## 추가정보 필드 상세

| 필드 | 입력방식 | 비고 |
|------|---------|------|
| 이름 | 텍스트 입력 | 항상 비공개 |
| 전화번호 | 텍스트 입력 | 항상 비공개, 이벤트 경품 발송용 |
| 나이 | 드롭다운 | 공개 선택 가능 |
| 성별 | 드롭다운 | 공개 선택 가능 |
| 투자경험 | 드롭다운 | 없음/1년미만/1~3년/3~5년/5~10년/10년이상 |
| 투자성향 | 드롭다운 | 안정형/안정추구형/위험중립형/적극투자형/공격투자형 |

## 회원가입 흐름
- 소셜 로그인 = 즉시 가입 (추가 입력 없음)
- 닉네임/추가정보는 필요 시점에 마이페이지로 유도 (예: 커뮤니티 첫 이용 시)
- 로그인 모달 하단에 동의 문구 추가: "계속하면 이용약관, 개인정보처리방침, 제3자 정보제공에 동의한 것으로 간주합니다"

## 제3자 정보제공 동의
- 목적: 증권사에 ETF 관심 고객 DB 제공
- 마이페이지에서 토글로 동의/철회
- 상세 약관은 기존 개인정보처리방침 페이지에 통합
- 동의/철회 일시는 DB에만 저장 (UI 미표시)
- 철회 시 이후 제공 중단, 이미 제공된 정보는 수신자 정책에 따라 관리

## DB 변경
현재 User 모델 없음 (Keycloak JWT sub으로만 식별). 새로 생성 필요:

```prisma
model User {
  id                String    @id @default(uuid()) @db.Uuid
  keycloakId        String    @unique @map("keycloak_id")
  nickname          String?   @unique
  name              String?
  phone             String?
  age               String?
  gender            String?
  investExp         String?   @map("invest_exp")
  investStyle       String?   @map("invest_style")
  showAge           Boolean   @default(false) @map("show_age")
  showGender        Boolean   @default(false) @map("show_gender")
  showInvestExp     Boolean   @default(false) @map("show_invest_exp")
  showInvestStyle   Boolean   @default(false) @map("show_invest_style")
  thirdPartyConsent Boolean   @default(false) @map("third_party_consent")
  consentAt         DateTime? @map("consent_at")
  consentRevokedAt  DateTime? @map("consent_revoked_at")
  provider          String?
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  portfolios Portfolio[]

  @@map("users")
}
```

Portfolio 모델에 User 관계 추가 (userId → User.keycloakId 매핑).

## API 엔드포인트

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | /user/me | Yes | 내 프로필 조회 (없으면 자동 생성) |
| PATCH | /user/me | Yes | 프로필 수정 (닉네임, 추가정보, 공개설정, 동의) |
| DELETE | /user/me | Yes | 회원탈퇴 (User + Portfolio 전체 삭제) |

## 회원탈퇴 처리
1. 해당 유저의 모든 Portfolio 삭제
2. User 레코드 삭제
3. Keycloak 세션 로그아웃
4. 프론트에서 세션 클리어 후 홈으로 리다이렉트

## 로그인 모달 변경
기존 login-modal.tsx 하단에 동의 문구 추가.

## 개인정보처리방침/이용약관 변경
기존 /privacy, /terms 페이지에 제3자 정보제공 관련 필수 기재사항 추가:
- 제공받는 자, 제공 목적, 제공 항목, 보유/이용 기간, 동의 거부 권리 및 불이익
