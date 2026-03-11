-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "etf" (
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "etf_tab_code" INTEGER,
    "benchmark" VARCHAR(100),
    "issuer" VARCHAR(50),
    "listed_date" DATE,
    "price" INTEGER,
    "change_rate" DECIMAL(8,4),
    "nav" DECIMAL(12,2),
    "one_month_earn_rate" DECIMAL(8,4),
    "three_month_earn_rate" DECIMAL(8,4),
    "six_month_earn_rate" DECIMAL(8,4),
    "one_year_earn_rate" DECIMAL(8,4),
    "volume" BIGINT,
    "aum" BIGINT,
    "expense_ratio" DECIMAL(5,4),
    "dividend_yield" DECIMAL(6,2),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etf_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "etf_holding" (
    "id" SERIAL NOT NULL,
    "etf_code" VARCHAR(10) NOT NULL,
    "stock_code" VARCHAR(10),
    "stock_name" VARCHAR(100),
    "weight" DECIMAL(6,3),
    "shares" BIGINT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etf_holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etf_daily_price" (
    "etf_code" VARCHAR(10) NOT NULL,
    "date" DATE NOT NULL,
    "close" INTEGER NOT NULL,
    "open" INTEGER NOT NULL,
    "high" INTEGER NOT NULL,
    "low" INTEGER NOT NULL,
    "volume" BIGINT NOT NULL,
    "nav" DECIMAL(12,2),

    CONSTRAINT "etf_daily_price_pkey" PRIMARY KEY ("etf_code","date")
);

-- CreateTable
CREATE TABLE "portfolio" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "items" JSONB NOT NULL,
    "snapshot" JSONB,
    "return_rate" DECIMAL(8,2),
    "mdd" DECIMAL(8,2),
    "feedback_text" TEXT,
    "feedback_actions" JSONB,
    "feedback_snippet" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_amount" BIGINT NOT NULL DEFAULT 100000000,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etf_dividend" (
    "etf_code" VARCHAR(10) NOT NULL,
    "date" DATE NOT NULL,
    "pay_date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "rate" DECIMAL(8,5) NOT NULL,

    CONSTRAINT "etf_dividend_pkey" PRIMARY KEY ("etf_code","date")
);

-- CreateTable
CREATE TABLE "etf_return" (
    "etf_code" VARCHAR(10) NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "return_rate" DECIMAL(8,4) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etf_return_pkey" PRIMARY KEY ("etf_code","period")
);

-- CreateIndex
CREATE INDEX "etf_benchmark_idx" ON "etf"("benchmark");

-- CreateIndex
CREATE INDEX "etf_aum_idx" ON "etf"("aum" DESC);

-- CreateIndex
CREATE INDEX "etf_name_idx" ON "etf"("name");

-- CreateIndex
CREATE INDEX "etf_listed_date_idx" ON "etf"("listed_date");

-- CreateIndex
CREATE INDEX "etf_one_year_earn_rate_idx" ON "etf"("one_year_earn_rate" DESC);

-- CreateIndex
CREATE INDEX "etf_three_month_earn_rate_idx" ON "etf"("three_month_earn_rate" DESC);

-- CreateIndex
CREATE INDEX "etf_categories_idx" ON "etf"("categories");

-- CreateIndex
CREATE INDEX "etf_holding_etf_code_idx" ON "etf_holding"("etf_code");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_slug_key" ON "portfolio"("slug");

-- CreateIndex
CREATE INDEX "portfolio_user_id_idx" ON "portfolio"("user_id");

-- CreateIndex
CREATE INDEX "portfolio_user_id_id_idx" ON "portfolio"("user_id", "id");

-- CreateIndex
CREATE INDEX "portfolio_user_id_is_draft_idx" ON "portfolio"("user_id", "is_draft");

-- CreateIndex
CREATE INDEX "portfolio_return_rate_idx" ON "portfolio"("return_rate" DESC);

-- CreateIndex
CREATE INDEX "portfolio_created_at_idx" ON "portfolio"("created_at" DESC);

-- CreateIndex
CREATE INDEX "portfolio_slug_idx" ON "portfolio"("slug");

-- CreateIndex
CREATE INDEX "portfolio_is_draft_idx" ON "portfolio"("is_draft");

-- AddForeignKey
ALTER TABLE "etf_holding" ADD CONSTRAINT "etf_holding_etf_code_fkey" FOREIGN KEY ("etf_code") REFERENCES "etf"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etf_daily_price" ADD CONSTRAINT "etf_daily_price_etf_code_fkey" FOREIGN KEY ("etf_code") REFERENCES "etf"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etf_dividend" ADD CONSTRAINT "etf_dividend_etf_code_fkey" FOREIGN KEY ("etf_code") REFERENCES "etf"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etf_return" ADD CONSTRAINT "etf_return_etf_code_fkey" FOREIGN KEY ("etf_code") REFERENCES "etf"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

