import { supabase } from './supabase-client.ts';
import type { User, Session, AuthChangeEvent, Subscription } from '@supabase/supabase-js';

export interface UserProfile {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  userId: string;
  isGuest: boolean;
}

function extractProfile(user: User): UserProfile {
  const meta = user.user_metadata ?? {};
  const isGuest = user.is_anonymous === true;

  const displayName =
    meta.full_name || meta.name || meta.preferred_username || meta.email || user.email || 'Guest';

  return {
    displayName,
    email: user.email ?? meta.email ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    userId: user.id,
    isGuest,
  };
}

export type AuthStateCallback = (
  event: AuthChangeEvent,
  session: Session | null,
  profile: UserProfile | null,
) => void;

class AuthManager {
  private subscription: Subscription | null = null;

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  async getProfile(): Promise<UserProfile | null> {
    const user = await this.getUser();
    return user ? extractProfile(user) : null;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  }

  async signInAsGuest(): Promise<void> {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(callback: AuthStateCallback): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const profile = session?.user ? extractProfile(session.user) : null;
      callback(event, session, profile);
    });
    this.subscription = data.subscription;
    return () => {
      this.subscription?.unsubscribe();
      this.subscription = null;
    };
  }

  destroy(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }
}

export const authManager = new AuthManager();
