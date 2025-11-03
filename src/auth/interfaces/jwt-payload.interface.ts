export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
  accessToken: string;
  refreshToken: string;
}
