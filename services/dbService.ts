
import { UserStats } from '../types';

const STORAGE_KEY = 'auditgig_user_data';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  balance: number;
  joinedDate: string;
  passkeyCredentialId?: string;
  stats: UserStats;
}

const DEFAULT_STATS: UserStats = {
  impactPoints: 0,
  streak: 0,
  trustScore: 95,
  level: 1
};

export const dbService = {
  async saveUser(user: UserProfile) {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEY + '_list') || '{}');
    users[user.email] = user;
    localStorage.setItem(STORAGE_KEY + '_list', JSON.stringify(users));
    localStorage.setItem(STORAGE_KEY + '_current', JSON.stringify(user));
  },

  async getUser(email: string): Promise<UserProfile | null> {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEY + '_list') || '{}');
    const user = users[email] || null;
    if (user && !user.stats) user.stats = DEFAULT_STATS;
    return user;
  },

  async getUserByCredentialId(credentialId: string): Promise<UserProfile | null> {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEY + '_list') || '{}');
    return Object.values(users).find((u: any) => u.passkeyCredentialId === credentialId) as UserProfile || null;
  },

  async updateBalance(email: string, newBalance: number) {
    const user = await this.getUser(email);
    if (user) {
      user.balance = newBalance;
      user.stats.impactPoints += 1;
      if (user.stats.impactPoints % 5 === 0) user.stats.level += 1;
      await this.saveUser(user);
    }
  }
};
