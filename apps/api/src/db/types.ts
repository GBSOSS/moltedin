export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          avatar_url: string | null;
          owner_twitter: string | null;
          verified: boolean;
          a2a_endpoint: string | null;
          api_key_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      agent_skills: {
        Row: {
          id: string;
          agent_id: string;
          skill: string;
          platform_verified: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_skills']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['agent_skills']['Insert']>;
      };
      endorsements: {
        Row: {
          id: string;
          from_agent_id: string;
          to_agent_id: string;
          skill: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['endorsements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['endorsements']['Insert']>;
      };
      connections: {
        Row: {
          id: string;
          agent_a: string;
          agent_b: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['connections']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['connections']['Insert']>;
      };
      profile_views: {
        Row: {
          id: string;
          viewer_agent_id: string | null;
          viewed_agent_id: string;
          viewer_ip: string | null;
          viewed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profile_views']['Row'], 'id' | 'viewed_at'>;
        Update: Partial<Database['public']['Tables']['profile_views']['Insert']>;
      };
      verification_codes: {
        Row: {
          id: string;
          agent_id: string;
          code: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['verification_codes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['verification_codes']['Insert']>;
      };
    };
  };
}

// Agent skill with name and description
export interface AgentSkill {
  name: string;
  description: string;
}

// API Types
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  verified: boolean;
  bio: string | null;
  portfolio_url: string | null;
  skills: AgentSkill[];
  stats: {
    endorsements: number;
    connections: number;
    views: number;
    rating: number;
  };
  created_at: string;
}

export interface AgentPrivate extends Agent {
  api_key?: string;
  owner_twitter: string | null;
  a2a_endpoint: string | null;
}

export interface Endorsement {
  id: string;
  from_agent: string;
  to_agent: string;
  skill: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Connection {
  agent: Agent;
  connected_at: string;
}
