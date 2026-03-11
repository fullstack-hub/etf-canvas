import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 — ETF Canvas',
  description: 'ETF Canvas 개인정보처리방침. 수집하는 개인정보, 이용 목적, 보유 기간 등을 안내합니다.',
  alternates: { canonical: 'https://etf-canvas.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-8">개인정보처리방침</h1>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. 수집하는 개인정보</h2>
            <p>ETF Canvas는 소셜 로그인 및 서비스 이용 시 다음 정보를 수집합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>이름 (닉네임), 이메일 주소, 프로필 사진 URL (소셜 로그인 시 자동 수집)</li>
              <li>이름, 전화번호, 연령대, 성별, 주식투자 경험, 투자 성향 (이용자가 직접 입력, 선택사항)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 식별 및 로그인 처리</li>
              <li>포트폴리오 저장 및 관리</li>
              <li>커뮤니티 이용 시 닉네임 표시</li>
              <li>이벤트 당첨 시 경품 발송 (전화번호)</li>
              <li>서비스 개선</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. 개인정보의 보유 및 파기</h2>
            <p>회원 탈퇴 시 수집된 개인정보를 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section id="third-party">
            <h2 className="text-base font-semibold text-foreground mb-2">4. 개인정보의 제3자 제공</h2>
            <p>ETF Canvas는 이용자의 동의를 받은 경우에 한하여 아래와 같이 개인정보를 제3자에게 제공할 수 있습니다. 동의는 마이페이지에서 언제든지 철회할 수 있으며, 철회 시 이후 정보 제공이 중단됩니다.</p>
            <div className="mt-3 rounded-lg border p-4 space-y-2">
              <div className="flex gap-2">
                <span className="font-medium text-foreground shrink-0 w-28">제공받는 자</span>
                <span>제휴 증권사 (제휴 시 구체적 사명 고지 예정)</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground shrink-0 w-28">제공 목적</span>
                <span>ETF 및 금융투자 관심 고객 대상 맞춤 정보 제공</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground shrink-0 w-28">제공 항목</span>
                <span>연령대, 성별, 주식투자 경험, 투자 성향</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground shrink-0 w-28">보유·이용 기간</span>
                <span>제공 목적 달성 시 또는 동의 철회 시까지 (최대 1년)</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground shrink-0 w-28">동의 거부 권리</span>
                <span>동의를 거부할 수 있으며, 거부 시에도 서비스 이용에 제한이 없습니다.</span>
              </div>
            </div>
            <p className="mt-3">이미 제공된 정보는 제공받은 자의 개인정보 처리방침에 따라 관리됩니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. 개인정보 보호책임자</h2>
            <p>문의: master@fullstackhub.net</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. 시행일</h2>
            <p>본 개인정보처리방침은 2026년 3월 11일부터 시행됩니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
