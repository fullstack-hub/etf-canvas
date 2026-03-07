export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/30 px-6 py-3 text-[11px] text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>© 2026 ETF Canvas</span>
        <div className="flex items-center gap-4">
          <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
          <a href="mailto:master@fullstackhub.net" className="hover:text-foreground transition-colors">문의</a>
        </div>
      </div>
    </footer>
  );
}
