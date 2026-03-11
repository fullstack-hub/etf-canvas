import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '서비스 이용약관 — ETF Canvas',
  description: 'ETF Canvas 서비스 이용약관. 서비스 내용, 이용자 의무, 면책 조항 등을 안내합니다.',
  alternates: { canonical: 'https://etfcanva.com/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-8">서비스 이용약관</h1>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. 목적</h2>
            <p>본 약관은 ETF Canvas(이하 &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을 규정합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. 서비스 내용</h2>
            <p>ETF Canvas는 ETF 포트폴리오 합성 및 성과 시뮬레이션 도구를 제공합니다. 본 서비스에서 제공하는 정보는 투자 권유가 아니며, 투자 판단의 책임은 이용자에게 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. 이용자의 의무</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>타인의 개인정보를 도용하여 가입하지 않습니다.</li>
              <li>서비스의 정상적인 운영을 방해하지 않습니다.</li>
              <li>서비스를 통해 얻은 정보를 상업적으로 무단 이용하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. 면책 조항</h2>
            <p>서비스에서 제공하는 수익률, 변동성 등의 수치는 과거 데이터 기반 시뮬레이션 결과이며, 미래 수익을 보장하지 않습니다. 이를 근거로 한 투자 손실에 대해 서비스 제공자는 책임을 지지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. 회원 탈퇴</h2>
            <p>이용자는 마이페이지에서 언제든지 회원 탈퇴를 할 수 있습니다. 탈퇴 시 저장된 모든 포트폴리오 및 개인정보가 즉시 삭제되며, 이 작업은 되돌릴 수 없습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. 서비스 변경 및 중단</h2>
            <p>서비스 제공자는 운영상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. 시행일</h2>
            <p>본 약관은 2026년 3월 11일부터 시행됩니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
