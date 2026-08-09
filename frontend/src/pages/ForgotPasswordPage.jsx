import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiArrowLeft, HiCheck, HiCloudUpload, HiEye, HiEyeOff, HiLockClosed, HiMail, HiRefresh, HiShieldCheck, HiX } from 'react-icons/hi'
import { forgotPassword, resetPassword, verifyOtp } from '../store/slices/authSlice'
import toast from 'react-hot-toast'

const steps = ['Email', 'Verify', 'Password']

const ForgotPasswordPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector(state => state.auth)
  const inputs = useRef([])
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('idle')
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (!resendIn) return undefined
    const timer = setInterval(() => setResendIn(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, domain) => `${start}${'*'.repeat(Math.min(middle.length, 7))}${domain}`)
  const sendCode = async (event) => {
    event?.preventDefault()
    try {
      await dispatch(forgotPassword(email.trim())).unwrap()
      setDigits(Array(6).fill('')); setStatus('idle'); setResendIn(60); setStep(2)
      toast.success('Verification code sent')
      setTimeout(() => inputs.current[0]?.focus(), 150)
    } catch (error) { toast.error(error || 'Unable to send verification code') }
  }

  const updateDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits(current => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    setStatus('idle')
    if (digit && index < 5) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus()
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    event.preventDefault()
    setDigits(Array.from({ length: 6 }, (_, index) => pasted[index] || ''))
    inputs.current[Math.min(pasted.length, 6) - 1]?.focus()
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    const otp = digits.join('')
    if (otp.length !== 6) return toast.error('Enter all 6 digits')
    setStatus('checking')
    try {
      const token = await dispatch(verifyOtp({ email, otp })).unwrap()
      setResetToken(token); setStatus('success')
      setTimeout(() => setStep(3), 650)
    } catch (error) {
      setStatus('error'); toast.error(error || 'Invalid verification code')
      setTimeout(() => { setDigits(Array(6).fill('')); setStatus('idle'); inputs.current[0]?.focus() }, 900)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    if (newPassword.length < 8) return toast.error('Use at least 8 characters')
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    try {
      await dispatch(resetPassword({ email, resetToken, newPassword })).unwrap()
      toast.success('Password reset successfully')
      navigate('/login', { replace: true })
    } catch (error) { toast.error(error || 'Password reset failed') }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] border border-white/25 bg-white/10 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,.32)] backdrop-blur-2xl sm:p-9">
      <div className="pointer-events-none absolute -left-20 -top-24 h-48 w-48 rounded-full bg-white/10" />
      <header className="relative text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/30 bg-gradient-to-br from-white/25 to-indigo-400/20 shadow-xl"><HiCloudUpload className="text-3xl" /></div>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-200">Secure account recovery</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{step === 1 ? 'Forgot password?' : step === 2 ? 'OTP Verification' : 'Create new password'}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-300">{step === 1 ? 'Enter your AirDrive email and we will send a secure verification code.' : step === 2 ? `Enter the 6-digit code sent to ${maskedEmail}.` : 'Choose a strong password you have not used before.'}</p>
      </header>

      <div className="my-6 flex items-center justify-center gap-2">{steps.map((label, index) => <React.Fragment key={label}><div className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${step > index + 1 ? 'bg-emerald-400 text-slate-950' : step === index + 1 ? 'bg-indigo-400 text-white ring-4 ring-indigo-300/15' : 'bg-white/10 text-slate-400'}`}>{step > index + 1 ? <HiCheck /> : index + 1}</div>{index < 2 && <div className={`h-px w-10 ${step > index + 1 ? 'bg-emerald-400' : 'bg-white/15'}`} />}</React.Fragment>)}</div>

      <AnimatePresence mode="wait">
        {step === 1 && <motion.form key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} onSubmit={sendCode} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-200">Email address</span><div className="relative"><HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus type="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-white outline-none placeholder:text-slate-500 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-300/10" placeholder="you@example.com" /></div></label><button disabled={loading} className="w-full rounded-xl border border-white/25 bg-gradient-to-r from-indigo-400/80 to-violet-500/80 py-3 font-bold shadow-xl transition hover:-translate-y-0.5 disabled:opacity-60">{loading ? 'Sending code...' : 'Send verification code'}</button></motion.form>}

        {step === 2 && <motion.form key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} onSubmit={verifyCode} className="space-y-4"><div className="relative flex h-20 items-center justify-center"><div className={`flex gap-2 transition-all duration-500 ${status === 'checking' ? 'scale-90 animate-pulse' : ''} ${status === 'success' || status === 'error' ? 'scale-75 opacity-0' : ''}`} onPaste={handlePaste}>{digits.map((digit, index) => <input key={index} ref={element => { inputs.current[index] = element }} aria-label={`OTP digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength="1" value={digit} onChange={event => updateDigit(index, event.target.value)} onKeyDown={event => handleKeyDown(index, event)} className={`h-14 w-11 rounded-xl border text-center text-xl font-black text-white outline-none backdrop-blur-xl sm:h-16 sm:w-12 ${digit ? 'border-indigo-300/60 bg-indigo-400/15' : 'border-white/20 bg-white/10'} focus:border-indigo-200 focus:ring-4 focus:ring-indigo-300/10`} />)}</div>{(status === 'success' || status === 'error') && <motion.div initial={{ scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`absolute grid h-16 w-16 place-items-center rounded-2xl border-2 text-3xl ${status === 'success' ? 'border-emerald-300 bg-emerald-400/15 text-emerald-300' : 'border-rose-300 bg-rose-400/15 text-rose-300'}`}>{status === 'success' ? <HiCheck /> : <HiX />}</motion.div>}</div><button disabled={loading || status === 'checking'} className="w-full rounded-xl border border-white/25 bg-gradient-to-r from-indigo-400/80 to-violet-500/80 py-3 font-bold shadow-xl disabled:opacity-60">{status === 'checking' ? 'Checking code...' : status === 'success' ? 'Verified' : 'Verify OTP'}</button><div className="flex items-center justify-between text-xs"><button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-300 hover:text-white"><HiArrowLeft /> Change email</button><button type="button" disabled={resendIn > 0 || loading} onClick={sendCode} className="flex items-center gap-1 font-bold text-indigo-200 disabled:text-slate-500"><HiRefresh /> {resendIn ? `Resend in ${resendIn}s` : 'Resend code'}</button></div></motion.form>}

        {step === 3 && <motion.form key="password" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} onSubmit={savePassword} className="space-y-4"><PasswordField label="New password" value={newPassword} onChange={setNewPassword} show={showPassword} toggle={() => setShowPassword(value => !value)} /><PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} /><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300"><p className="flex items-center gap-2 font-bold text-slate-200"><HiShieldCheck /> Password requirements</p><p className="mt-1">At least 8 characters and both entries must match.</p></div><button disabled={loading} className="w-full rounded-xl border border-white/25 bg-gradient-to-r from-indigo-400/80 to-violet-500/80 py-3 font-bold shadow-xl disabled:opacity-60">{loading ? 'Updating password...' : 'Reset password'}</button></motion.form>}
      </AnimatePresence>

      <p className="mt-6 text-center text-xs text-slate-400">Remembered your password? <Link to="/login" className="font-bold text-indigo-200 hover:text-white">Sign in</Link></p>
    </motion.section>
  )
}

const PasswordField = ({ label, value, onChange, show, toggle }) => <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-200">{label}</span><div className="relative"><HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type={show ? 'text' : 'password'} required value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-10 pr-10 text-white outline-none placeholder:text-slate-500 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-300/10" placeholder="Minimum 8 characters" />{toggle && <button type="button" onClick={toggle} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">{show ? <HiEyeOff /> : <HiEye />}</button>}</div></label>

export default ForgotPasswordPage
