export interface Message {
  sender: 'user' | 'ai bot';
  content: string;
  timestamp: string;
}

export interface Query {
  query: 'user';
  content: string;
  timestamp: string;
}

export interface Response {
  query: 'ai bot';
  content: [string];
  timestamp: string;
}
