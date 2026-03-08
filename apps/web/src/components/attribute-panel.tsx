'use client';

const BOOK_URL = 'https://product.kyobobook.co.kr/detail/S000216524814';

export function AttributePanel() {
    return (
        <div className="w-72 border-l bg-background flex flex-col h-full z-10 shadow-sm overflow-y-auto">
            <div className="p-4 space-y-3">
                {/* 책 표지 */}
                <a
                    href={BOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-lg overflow-hidden border border-border/40 hover:border-border transition-colors"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/ads/etf-book.jpg"
                        alt="성공적인 개인 투자를 위한 ETF 안내서"
                        className="w-full h-auto"
                    />
                    <div className="px-3 py-2.5 bg-muted/20">
                        <p className="text-[11px] font-semibold leading-snug">성공적인 개인 투자를 위한 ETF 안내서</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">안해성 지음</p>
                    </div>
                </a>

                {/* 책 상세 이미지 */}
                <a
                    href={BOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-border/40 hover:border-border transition-colors"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/ads/etf-book-detail.jpg"
                        alt="ETF 안내서 상세"
                        className="w-full h-auto"
                    />
                </a>
            </div>
        </div>
    );
}
