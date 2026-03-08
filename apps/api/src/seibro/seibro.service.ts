import { Injectable, Logger } from '@nestjs/common';

export interface DividendRecord {
  date: string;       // 기준일 YYYY-MM-DD
  payDate: string;    // 지급일 YYYY-MM-DD
  amount: number;     // 분배금 (원)
  rate: number;       // 분배율
}

@Injectable()
export class SeibroService {
  private readonly logger = new Logger(SeibroService.name);

  /**
   * 종목코드(6자리) → ISIN 코드 변환
   * 규칙: KR7 + 6자리코드 + 0 + 체크디짓(Luhn mod 10)
   */
  codeToIsin(code: string): string {
    const base = `KR7${code}00`; // 11자리 base + 체크디짓 1자리 = 12자리 ISIN
    // ISIN 체크디짓: 문자→숫자 변환 후 Luhn
    const digits = base
      .split('')
      .map((c) => {
        const n = c.charCodeAt(0);
        if (n >= 65 && n <= 90) return String(n - 55);
        return c;
      })
      .join('');

    let sum = 0;
    let alt = true;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (alt) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      alt = !alt;
    }
    const check = (10 - (sum % 10)) % 10;
    return base + check;
  }

  /**
   * 세이브로에서 ETF 분배금 히스토리 조회
   */
  async fetchDividendHistory(code: string): Promise<DividendRecord[]> {
    const isin = this.codeToIsin(code);

    try {
      // 1. 세션 쿠키 획득
      const mainResp = await fetch(
        'https://seibro.or.kr/websquare/control.jsp?w2xPath=/IPORTAL/user/etf/BIP_CNTS06030V.xml&menuNo=179',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      );
      const cookies = mainResp.headers.getSetCookie
        ? mainResp.headers.getSetCookie()
        : [];
      const cookieStr = cookies.map((c) => c.split(';')[0]).join('; ');

      // 2. 분배금 데이터 요청 (최근 5년)
      const now = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);
      const toDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      const fromDate = fiveYearsAgo.toISOString().slice(0, 10).replace(/-/g, '');

      const body = `<reqParam action="exerInfoDtramtPayStatPlist" task="ksd.safe.bip.cnts.etf.process.EtfExerInfoPTask"><MENU_NO value="179"/><CMM_BTN_ABBR_NM value="total_search"/><W2XPATH value="/IPORTAL/user/etf/BIP_CNTS06030V.xml"/><etf_sort_level_cd value="1"/><etf_big_sort_cd value=""/><START_PAGE value="1"/><END_PAGE value="200"/><etf_sort_cd value=""/><isin value="${isin}"/><mngco_custno value=""/><RGT_RSN_DTAIL_SORT_CD value="11"/><fromRGT_STD_DT value="${fromDate}"/><toRGT_STD_DT value="${toDate}"/></reqParam>`;

      const resp = await fetch(
        'https://seibro.or.kr/websquare/engine/proworks/callServletService.jsp',
        {
          method: 'POST',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Content-Type': 'application/xml; charset=UTF-8',
            Cookie: cookieStr,
            Referer:
              'https://seibro.or.kr/websquare/control.jsp?w2xPath=/IPORTAL/user/etf/BIP_CNTS06030V.xml&menuNo=179',
          },
          body,
        },
      );

      if (!resp.ok) return [];
      const xml = await resp.text();

      // 3. XML 파싱
      const items = [
        ...xml.matchAll(
          /<data vectorkey="\d+"[^>]*>[\s\S]*?<result>([\s\S]*?)<\/result>/g,
        ),
      ];

      return items.map((item) => {
        const raw = item[1];
        const dateRaw =
          raw.match(/RGT_STD_DT value="([^"]*)"/)?.[1] || '';
        const payDateRaw =
          raw.match(/TH1_PAY_TERM_BEGIN_DT value="([^"]*)"/)?.[1] || '';
        const amount = Number(
          raw.match(/ESTM_STDPRC value="([^"]*)"/)?.[1] || '0',
        );
        const rate = Number(
          raw.match(/BUNBE value="([^"]*)"/)?.[1] || '0',
        );

        return {
          date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
          payDate: `${payDateRaw.slice(0, 4)}-${payDateRaw.slice(4, 6)}-${payDateRaw.slice(6, 8)}`,
          amount,
          rate,
        };
      });
    } catch (e) {
      this.logger.warn(`세이브로 분배금 조회 실패: ${code} — ${e}`);
      return [];
    }
  }
}
