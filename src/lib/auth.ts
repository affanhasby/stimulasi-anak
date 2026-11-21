import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** undefined while the stored session is read; null when signed out. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

const redirectTo = () => `${location.origin}${import.meta.env.BASE_URL}`

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/

// Supabase messages are English; parents read Indonesian. Unknown errors fall back to a generic line.
function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'Email/username atau kata sandi salah.'
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Buka tautan di email pendaftaran.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Email ini sudah terdaftar. Silakan masuk.'
  if (m.includes('database error saving new user')) return 'Username sudah dipakai. Coba yang lain.'
  if (m.includes('password')) return 'Kata sandi minimal 8 karakter.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  if (m.includes('fetch') || m.includes('network')) return 'Tidak ada koneksi. Periksa internet lalu coba lagi.'
  return 'Terjadi kendala. Coba lagi sebentar lagi.'
}

export async function usernameAvailable(name: string) {
  const { data, error } = await supabase.rpc('username_available', { name })
  if (error) throw new Error(friendly(error.message))
  return data === true
}

/** Returns true when the account is signed in right away (email confirmation off). */
export async function signUp(username: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.toLowerCase() }, emailRedirectTo: redirectTo() },
  })
  if (error) throw new Error(friendly(error.message))
  return !!data.session
}

export async function signIn(identifier: string, password: string) {
  let email = identifier.trim()
  if (!email.includes('@')) {
    // The server returns the email only for the right password, so a username alone exposes nothing.
    const { data, error } = await supabase.rpc('login_email', { p_username: email, p_password: password })
    if (error) throw new Error(error.message.includes('too_many_attempts') ? 'Terlalu banyak percobaan untuk username ini. Coba lagi 15 menit lagi.' : friendly(error.message))
    if (!data) throw new Error('Username atau kata sandi salah.')
    email = data
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(friendly(error.message))
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } })
  if (error) throw new Error(friendly(error.message))
}

export async function sendReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })
  if (error) throw new Error(friendly(error.message))
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(friendly(error.message))
}

export const signOut = () => supabase.auth.signOut()

/** Deletes the account and every row on the server (cascade), then signs out. */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw new Error(friendly(error.message))
  await supabase.auth.signOut({ scope: 'local' })
}
