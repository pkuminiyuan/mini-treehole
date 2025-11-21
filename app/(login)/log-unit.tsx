'use client';

import Link from 'next/link';
import { useActionState, useState, useEffect, useTransition } from 'react'; // <--- 添加 useTransition
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp, sendVerificationCode } from './actions';
import { ActionState } from '@/lib/auth/middleware';

// 定义验证码发送Action的响应类型
interface SendCodeState extends ActionState {
  isCodeSentSuccessfully?: boolean;
}

export function LogUnit({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');

  const [signupState, signupFormAction, signupPending] = useActionState<
    ActionState,
    FormData
  >(signUp, { error: '' });

  const [sendCodeState, sendCodeFormAction, sendCodePending] = useActionState<
    SendCodeState,
    FormData
  >(sendVerificationCode, { error: '' });

  const [isResendTransitioning, startResendTransition] = useTransition();

  type Step = 'email_input' | 'code_input';
  const [step, setStep] = useState<Step>('email_input'); // 注册流程的当前阶段
  const [optimisticEmail, setOptimisticEmail] = useState<string>(''); // 成功发送验证码后存储的完整邮箱
  const [verificationCode, setVerificationCode] = useState<string>(''); // 用户输入的验证码
  const PKU_EMAIL_SUFFIX = '@stu.pku.edu.cn';
  const VERIFICATION_CODE_LENGTH = 6; // 验证码6位

  // 学号前缀输入和验证
  const [emailPrefix, setEmailPrefix] = useState<string>(
    mode === 'signup' && signupState?.email
      ? signupState.email.split('@')[0]
      : ''
  );
  const [emailPrefixError, setEmailPrefixError] = useState<string | null>(
    null
  );

  const validateEmailPrefix = (prefix: string) => {
    if (mode === 'signin') return true; // 登录模式不需要特殊处理

    const isValid = /^\d{10}$/.test(prefix); // 学号是10位数字
    if (!isValid) {
      setEmailPrefixError('学号格式不正确，请确保为10位数字');
      return false;
    }
    setEmailPrefixError(null);
    return true;
  };

  const handleEmailPrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setEmailPrefix(value);
    validateEmailPrefix(value);
  };

  // 验证码倒计时逻辑
  const [countdown, setCountdown] = useState(0); // 倒计时秒数
  const CODED_RESEND_INTERVAL = 60; // 验证码重发间隔（秒）

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (timer) {
      clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // 当验证码发送成功时，进入第二阶段并启动倒计时
  useEffect(() => {
    // 只要验证码成功发送且没有错误，就启动/重置倒计时
    if (sendCodeState.isCodeSentSuccessfully && !sendCodeState.error) {
      // 如果目前在邮箱输入阶段，则切换到验证码输入阶段
      if (step === 'email_input') {
        setStep('code_input');
        setOptimisticEmail(emailPrefix + PKU_EMAIL_SUFFIX);
      }
      setCountdown(CODED_RESEND_INTERVAL); // 每次成功发送（包括重发）都重置倒计时
    }

    // 如果注册失败且在第二步，可能有email或password的错误，但邮箱本身是有效的
    if (signupState.error && step === 'code_input' && signupState.email) {
      setOptimisticEmail(signupState.email);
    }
  }, [sendCodeState.isCodeSentSuccessfully, sendCodeState.error, signupState.error, signupState.email, step, emailPrefix, PKU_EMAIL_SUFFIX]);

  // 登录模式的 actionState
  const [signinState, signinFormAction, signinPending] = useActionState<
    ActionState,
    FormData
  >(signIn, { error: '' });

  // 根据当前 mode 选择合适的 state 和 pending 变量
  const state = mode === 'signin' ? signinState : signupState;
  const pending = mode === 'signin' ? signinPending : signupPending;

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          {mode === 'signin' ? '登录你的账号' : '创建你的账号'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {mode === 'signin' ? (
          // --- 登录表单 ---
          <form className="space-y-6" action={signinFormAction}>
            <input type="hidden" name="redirect" value={redirect || ''} />
            <input type="hidden" name="priceId" value={priceId || ''} />
            <input type="hidden" name="inviteId" value={inviteId || ''} />
            <div>
              <Label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                邮箱
              </Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.email}
                  required
                  maxLength={50}
                  className="appearance-none rounded-full relative block w-full px-3 py-2 border placeholder-gray-500 text-foreground focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                  placeholder="请输入你的邮箱"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                密码
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  defaultValue={state.password}
                  required
                  minLength={8}
                  maxLength={100}
                  className="appearance-none rounded-full relative block w-full px-3 py-2 border placeholder-gray-500 text-foreground focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                  placeholder="请输入你的密码"
                />
              </div>
            </div>

            {state?.error && (
              <div className="text-red-500 text-sm">{state.error}</div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                disabled={signinPending}
              >
                {signinPending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    加载中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </div>
          </form>
        ) : (
          // --- 注册表单 ---
          <form
            className="space-y-6"
            action={async (formData) => {
              // 统一管理Redirect/PriceId/InviteId
              if (redirect) formData.append('redirect', redirect);
              if (priceId) formData.append('priceId', priceId);
              if (inviteId) formData.append('inviteId', inviteId);

              if (step === 'email_input') {
                // 客户端最终验证学号前缀
                if (!validateEmailPrefix(emailPrefix)) {
                  setEmailPrefixError('请填写正确的学号格式。');
                  return; // 阻止表单提交
                }
                const fullEmail = emailPrefix + PKU_EMAIL_SUFFIX;
                formData.set('email', fullEmail); // 将完整邮箱添加到formData
                await sendCodeFormAction(formData); // 调用发送验证码的 action
              } else if (step === 'code_input') {
                // 将验证码和完整邮箱添加到formData
                formData.set('email', optimisticEmail);
                formData.set('verificationCode', verificationCode);
                await signupFormAction(formData); // 调用注册 action
              }
            }}
          >

            {/* 邮箱/学号输入部分 - 仅在 step 为 'email_input' 时显示 */}
            {step === 'email_input' && (
              <div>
                <Label
                  htmlFor="emailPrefix"
                  className="block text-sm font-medium text-foreground"
                >
                  邮箱（仅限北大校内邮箱，如：学号{PKU_EMAIL_SUFFIX}）
                </Label>
                <div className="mt-1 flex rounded-full shadow-sm">
                  <Input
                    id="emailPrefix"
                    name="emailPrefixInput" // Name for internal use, actual 'email' is in hidden input
                    type="text"
                    autoComplete="username"
                    value={emailPrefix}
                    onChange={handleEmailPrefixChange}
                    required
                    maxLength={10}
                    className="flex-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-foreground focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm rounded-l-full"
                    placeholder="请输入你的学号"
                    aria-describedby="email-suffix-text"
                  />
                  <span
                    id="email-suffix-text"
                    className="inline-flex items-center px-3 py-2 border border-l-0 text-gray-500 border-gray-300 bg-gray-50 rounded-r-full sm:text-sm"
                  >
                    {PKU_EMAIL_SUFFIX}
                  </span>
                </div>
                {emailPrefixError && (
                  <div className="text-red-500 text-sm mt-1">
                    {emailPrefixError}
                  </div>
                )}
                {/* 发送验证码失败的错误信息 */}
                {sendCodeState?.error && (
                  <div className="text-red-500 text-sm mt-1">
                    {sendCodeState.error}
                  </div>
                )}
              </div>
            )}

            {/* 验证码输入部分 - 仅在 step 为 'code_input' 时显示 */}
            {step === 'code_input' && (
              <>
                <div className="text-sm text-center text-gray-600">
                  验证码已发送至{' '}
                  <span className="font-bold text-orange-600">
                    {optimisticEmail}
                  </span>
                  ，请注意查收。
                </div>
                <div>
                  <Label
                    htmlFor="verificationCode"
                    className="block text-sm font-medium text-foreground"
                  >
                    验证码
                  </Label>
                  <div className="mt-1">
                    <Input
                      id="verificationCode"
                      name="verificationCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*" // 限制输入数字
                      autoComplete="one-time-code"
                      value={verificationCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        // 允许空值或全数字，并限制长度
                        if (val === '' || (/^\d*$/.test(val) && val.length <= VERIFICATION_CODE_LENGTH)) {
                          setVerificationCode(val);
                        }
                      }}
                      required
                      maxLength={VERIFICATION_CODE_LENGTH}
                      className="appearance-none rounded-full relative block w-full px-3 py-2 border placeholder-gray-500 text-foreground focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder={`请输入${VERIFICATION_CODE_LENGTH}位验证码`}
                    />
                  </div>
                  {/* 可选：显示验证码输入错误 */}
                  {signupState?.error && signupState.error.includes('验证码') && (
                    <div className="text-red-500 text-sm mt-1">
                      {signupState.error}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 密码输入部分 - 仅在 step 为 'code_input' 时显示 */}
            {step === 'code_input' && (
              <div>
                <Label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  密码
                </Label>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    defaultValue={signupState.password} // 如果注册失败，保持密码输入
                    required
                    minLength={8}
                    maxLength={100}
                    className="appearance-none rounded-full relative block w-full px-3 py-2 border placeholder-gray-500 text-foreground focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="请输入你的密码"
                  />
                </div>
                {/* 注册失败的其他错误信息 */}
                {signupState?.error && !signupState.error.includes
                  ('验证码') && (
                    <div className="text-red-500 text-sm mt-1">
                      {signupState.error}
                    </div>
                  )}
              </div>
            )}

            <div>
              {step === 'email_input' && (
                <Button
                  type="submit" // 这个按钮直接触发 form action
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  disabled={!!emailPrefixError || !emailPrefix || sendCodePending || countdown > 0} // 禁用条件调整
                >
                  {sendCodePending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      发送中...
                    </>
                  ) : countdown > 0 ? (
                    `重新发送 (${countdown}s)`
                  ) : (
                    '发送验证码'
                  )}
                </Button>
              )}

              {step === 'code_input' && (
                <Button
                  type="submit"
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  disabled={signupPending || verificationCode.length !== VERIFICATION_CODE_LENGTH} // 验证码长度不符时禁用
                >
                  {signupPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      注册中...
                    </>
                  ) : (
                    '注册'
                  )}
                </Button>
              )}
            </div>
            {/* 倒计时重发按钮 */}
            {step === 'code_input' && (
              <div className="mt-2 text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    if (countdown === 0 && optimisticEmail && !sendCodePending && !isResendTransitioning) {
                      const formData = new FormData();
                      formData.append('email', optimisticEmail);
                      if (redirect) formData.append('redirect', redirect);

                      startResendTransition(() => {
                        sendCodeFormAction(formData);
                      });
                    }
                  }}
                  disabled={countdown > 0 || sendCodePending || isResendTransitioning}
                  className="text-sm text-orange-600"
                >
                  {sendCodePending || isResendTransitioning ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      重新发送中...
                    </>
                  ) : countdown > 0 ? (
                    `重新发送 (${countdown}s)`
                  ) : (
                    '重新发送验证码'
                  )}
                </Button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-foreground">
                {mode === 'signin' ? '还没有账号?' : '已经完成注册?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
              className="w-full flex justify-center py-2 px-4 border rounded-full shadow-sm text-sm font-medium text-foreground bg-card hover:bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {mode === 'signin' ? '创建一个账号' : '登录已有账号'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}