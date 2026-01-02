import { DataSource } from 'typeorm';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'ARChi0272',
  database: process.env.DB_NAME || 'nkabom_daycare',
  synchronize: process.env.DB_SYNC === 'true',
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../models/**/*.ts')],
  migrations: [path.join(__dirname, '../migrations/**/*.ts')],
  subscribers: [path.join(__dirname, '../subscribers/**/*.ts')],
});

export async function initializeDatabase() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection established');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}
