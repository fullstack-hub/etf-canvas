'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, UserX, Check, X, Pencil, Shield, Eye, User as UserIcon, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const AGE_OPTIONS = ['10대', '20대', '30대', '40대', '50대', '60대 이상'];
const GENDER_OPTIONS = ['남성', '여성'];
const INVEST_EXP_OPTIONS = ['없음', '1년 미만', '1~3년', '3~5년', '5~10년', '10년 이상'];
const INVEST_STYLE_OPTIONS = ['안정형', '안정추구형', '위험중립형', '적극투자형', '공격투자형'];

const PROVIDER_MAP: Record<string, { label: string; bg: string; text: string }> = {
  kakao: { label: '카카오', bg: 'bg-[#FEE500]/15', text: 'text-[#FEE500]' },
  naver: { label: '네이버', bg: 'bg-[#03C75A]/15', text: 'text-[#03C75A]' },
  google: { label: 'Google', bg: 'bg-white/10', text: 'text-white/80' },
};

function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const dot = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5';
  const translate = size === 'sm' ? 'translate-x-[17px]' : 'translate-x-[22px]';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${dims} shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-out
        ${checked
          ? 'bg-gradient-to-r from-chart-1/90 to-chart-5/90 shadow-[0_0_12px_rgba(180,120,60,0.3)]'
          : 'bg-muted-foreground/20 hover:bg-muted-foreground/30'}`}
    >
      <span
        className={`pointer-events-none block ${dot} rounded-full shadow-md transition-all duration-300 ease-out
          ${checked ? `${translate} bg-white scale-110` : 'translate-x-[3px] bg-muted-foreground/60 scale-100'}`}
      />
    </button>
  );
}

export function MypageView() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { clearCanvas, setCurrentView } = useCanvasStore();

  const { data: me, isLoading } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.getMe(),
    enabled: !!session?.user,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => api.withdrawMe(),
  });

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  const handleFieldUpdate = (field: string, value: any) => {
    updateMutation.mutate({ [field]: value });
  };

  const startEditNickname = () => {
    setNicknameInput(me?.nickname || '');
    setEditingNickname(true);
  };

  const saveNickname = () => {
    if (nicknameInput.trim() && nicknameInput !== me?.nickname) {
      handleFieldUpdate('nickname', nicknameInput.trim());
    }
    setEditingNickname(false);
  };

  const handleLogout = async () => {
    clearCanvas();
    setCurrentView('canvas');
    const res = await fetch('/api/auth/logout');
    const { logoutUrl } = await res.json();
    signOut({ redirect: false });
    window.location.href = logoutUrl;
  };

  const handleWithdraw = async () => {
    await withdrawMutation.mutateAsync();
    clearCanvas();
    setCurrentView('canvas');
    const res = await fetch('/api/auth/logout');
    const { logoutUrl } = await res.json();
    signOut({ redirect: false });
    window.location.href = logoutUrl;
  };

  if (isLoading || !me) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-36 bg-card rounded-2xl" />
            <div className="h-20 bg-card rounded-2xl" />
            <div className="h-48 bg-card rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const providerKey = me.provider || (session as any)?.idp || null;
  const provider = providerKey ? PROVIDER_MAP[providerKey] : null;
  const initial = (me.nickname || me.name || session?.user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto px-6 py-10 space-y-5">

        {/* ── Profile Hero ── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/30 border border-border/50 p-6">
          {/* subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
          <div className="relative flex items-center gap-5">
            <div className="relative group">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-chart-1/20 to-chart-5/20 flex items-center justify-center text-2xl font-bold overflow-hidden ring-2 ring-border/50 ring-offset-2 ring-offset-card transition-all">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="bg-gradient-to-br from-chart-1 to-chart-5 bg-clip-text text-transparent">{initial}</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold truncate">{me.nickname || me.name || '사용자'}</h2>
                {!me.nickname && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-chart-5/15 text-chart-5">닉네임 미설정</span>
                )}
              </div>
              {provider && (
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md ${provider.bg} ${provider.text}`}>
                  {provider.label} 계정
                </span>
              )}
              {session?.user?.email && (
                <p className="text-xs text-muted-foreground/50 mt-1 truncate">{session.user.email}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Nickname ── */}
        <section className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-chart-2/15 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-chart-2" />
            </div>
            <h3 className="text-sm font-semibold">닉네임</h3>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">커뮤니티에서 사용</span>
          </div>
          {editingNickname ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') setEditingNickname(false); }}
                className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-chart-2/50 focus:ring-1 focus:ring-chart-2/20 transition-all"
                maxLength={20}
                placeholder="닉네임 입력"
              />
              <button onClick={saveNickname} className="p-2 rounded-lg bg-chart-2/15 hover:bg-chart-2/25 transition-colors text-chart-2">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingNickname(false)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-background/30 rounded-lg px-3 py-2.5">
              <span className="text-sm">{me.nickname || <span className="text-muted-foreground/40 italic">미설정</span>}</span>
              <button
                onClick={startEditNickname}
                className="text-xs px-2.5 py-1 rounded-md bg-chart-2/10 text-chart-2 hover:bg-chart-2/20 transition-colors"
              >
                변경
              </button>
            </div>
          )}
        </section>

        {/* ── Additional Info ── */}
        <section className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-chart-3/15 flex items-center justify-center">
              <UserIcon className="w-3.5 h-3.5 text-chart-3" />
            </div>
            <h3 className="text-sm font-semibold">추가 정보</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">선택</span>
          </div>

          <div className="space-y-3">
            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-xs text-muted-foreground">이름</span>
                  <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />
                </div>
                <input
                  type="text"
                  defaultValue={me.name || ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (me.name || '')) handleFieldUpdate('name', v || null);
                  }}
                  placeholder="미입력"
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-chart-3/50 transition-colors placeholder:text-muted-foreground/30"
                />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-xs text-muted-foreground">전화번호</span>
                  <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />
                </div>
                <input
                  type="tel"
                  defaultValue={me.phone || ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (me.phone || '')) handleFieldUpdate('phone', v || null);
                  }}
                  placeholder="010-0000-0000"
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-chart-3/50 transition-colors placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* Age + Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground mb-1.5 block">연령대</span>
                <Select value={me.age || ''} onValueChange={(v) => handleFieldUpdate('age', v || null)}>
                  <SelectTrigger className="h-9 w-full text-xs bg-background/50 border-border">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-1.5 block">성별</span>
                <Select value={me.gender || ''} onValueChange={(v) => handleFieldUpdate('gender', v || null)}>
                  <SelectTrigger className="h-9 w-full text-xs bg-background/50 border-border">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Experience + Style */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground mb-1.5 block">투자 경험</span>
                <Select value={me.investExp || ''} onValueChange={(v) => handleFieldUpdate('investExp', v || null)}>
                  <SelectTrigger className="h-9 w-full text-xs bg-background/50 border-border">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVEST_EXP_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-1.5 block">투자 성향</span>
                <Select value={me.investStyle || ''} onValueChange={(v) => handleFieldUpdate('investStyle', v || null)}>
                  <SelectTrigger className="h-9 w-full text-xs bg-background/50 border-border">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVEST_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* ── Visibility ── */}
        <section className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-chart-4/15 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-chart-4" />
            </div>
            <h3 className="text-sm font-semibold">공개 설정</h3>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">커뮤니티 프로필에 표시</span>
          </div>
          <div className="space-y-0.5">
            {([
              { key: 'showAge', label: '연령대' },
              { key: 'showGender', label: '성별' },
              { key: 'showInvestExp', label: '투자 경험' },
              { key: 'showInvestStyle', label: '투자 성향' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2.5 px-1 group">
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                <Toggle
                  checked={me[key]}
                  onChange={(v) => handleFieldUpdate(key, v)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Account Actions ── */}
        <section className="flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-border/50 bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-destructive/20 bg-destructive/5 text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-all">
                <UserX className="w-4 h-4" />
                탈퇴
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 탈퇴하시겠어요?</AlertDialogTitle>
                <AlertDialogDescription>
                  탈퇴하면 모든 데이터가 삭제되며 복구할 수 없습니다. 저장된 포트폴리오도 함께 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleWithdraw}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  탈퇴하기
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        {/* ── Third-party Consent (subtle) ── */}
        <section className="rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-muted-foreground/40" />
              <div>
                <span className="text-xs text-muted-foreground/60">제3자 정보 제공 동의</span>
                <a
                  href="/privacy#third-party"
                  target="_blank"
                  className="text-[10px] text-muted-foreground/40 underline hover:text-muted-foreground/60 ml-2"
                >
                  자세히
                </a>
              </div>
            </div>
            <Toggle
              checked={me.thirdPartyConsent}
              onChange={(v) => handleFieldUpdate('thirdPartyConsent', v)}
              size="sm"
            />
          </div>
        </section>

      </div>
    </div>
  );
}
