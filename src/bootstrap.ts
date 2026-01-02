// This file must be imported first to ensure reflect-metadata is initialized
import 'reflect-metadata';

// Load environment variables BEFORE importing anything else that might use them
import dotenv from 'dotenv';
dotenv.config();

// Now import the actual entry point
import './index';
