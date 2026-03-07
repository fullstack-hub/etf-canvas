export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-8">개인정보처리방침</h1>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. 수집하는 개인정보</h2>
            <p>ETF Canvas는 소셜 로그인 시 다음 정보를 수집합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>이름 (닉네임)</li>
              <li>이메일 주소</li>
              <li>프로필 사진 URL</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 식별 및 로그인 처리</li>
              <li>포트폴리오 저장 및 관리</li>
              <li>서비스 개선</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. 개인정보의 보유 및 파기</h2>
            <p>회원 탈퇴 시 수집된 개인정보를 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. 개인정보의 제3자 제공</h2>
            <p>ETF Canvas는 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. 개인정보 보호책임자</h2>
            <p>문의: master@fullstackhub.net</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. 시행일</h2>
            <p>본 개인정보처리방침은 2026년 3월 7일부터 시행됩니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
