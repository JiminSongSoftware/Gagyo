declare module 'pg' {
  export interface QueryResult<T = unknown> {
    rows: T[];
    rowCount?: number;
  }

  export interface ClientConfig {
    connectionString: string;
  }

  export class Client {
    constructor(config: ClientConfig);
    connect(): Promise<void>;
    query<T = unknown>(sql: string): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}
