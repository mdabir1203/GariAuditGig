
export enum AuditStatus {
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED'
}

export interface VehicleDefect {
  id: string;
  image: string;
  part: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  aiAnalysis?: string;
}

export interface AuditJob {
  id: string;
  carModel: string;
  licensePlate: string;
  location: string;
  distance: string;
  estimatedTime: string;
  reward: number;
  status: AuditStatus;
  images: {
    front?: string;
    rear?: string;
    left?: string;
    right?: string;
    interior?: string;
    registrationCard?: string;
  };
  defects: VehicleDefect[];
  registrationVerified?: boolean;
}

export interface UserWallet {
  balance: number;
  currency: string;
  transactions: {
    id: string;
    amount: number;
    date: string;
    type: 'earning' | 'withdrawal';
    status: 'pending' | 'completed';
  }[];
}

export interface UserStats {
  impactPoints: number; // Meaningful metrics (Cars made safe)
  streak: number; // Scarcity/Impatience
  trustScore: number; // Ownership/Possession
  level: number; // Development/Accomplishment
}
