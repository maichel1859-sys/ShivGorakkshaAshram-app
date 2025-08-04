import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Base repository interface
export interface IBaseRepository<T, CreateInput, UpdateInput, WhereInput = unknown> {
  // CRUD operations
  findById(id: string): Promise<T | null>;
  findMany(options?: FindManyOptions<WhereInput>): Promise<T[]>;
  findFirst(where: WhereInput): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<T>;
  
  // Bulk operations
  createMany(data: CreateInput[]): Promise<{ count: number }>;
  updateMany(where: WhereInput, data: UpdateInput): Promise<{ count: number }>;
  deleteMany(where: WhereInput): Promise<{ count: number }>;
  
  // Counting and pagination
  count(where?: WhereInput): Promise<number>;
  findManyWithPagination(options: PaginationOptions<WhereInput>): Promise<PaginatedResult<T>>;
  
  // Existence check
  exists(where: WhereInput): Promise<boolean>;
}

// Common interfaces
export interface FindManyOptions<WhereInput = unknown> {
  where?: WhereInput;
  orderBy?: unknown;
  select?: unknown;
  include?: unknown;
  take?: number;
  skip?: number;
}

export interface PaginationOptions<WhereInput = unknown> extends FindManyOptions<WhereInput> {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Abstract base repository implementation
export abstract class BaseRepository<T, CreateInput, UpdateInput, WhereInput = unknown> 
  implements IBaseRepository<T, CreateInput, UpdateInput, WhereInput> {
  
  protected db: PrismaClient;
  protected abstract modelName: string;
  
  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }
  
  // Get the Prisma model delegate with proper typing
  protected get model(): Record<string, unknown> {
    const model = (this.db as unknown as Record<string, Record<string, unknown>>)[this.modelName];
    if (!model) {
      throw new Error(`Model ${this.modelName} not found`);
    }
    return model;
  }

  // Helper method to safely call model methods
  protected async callModelMethod<R>(
    methodName: string, 
    options: unknown
  ): Promise<R> {
    const model = this.model as Record<string, (options: unknown) => Promise<R>>;
    const method = model[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method ${methodName} not found on model ${this.modelName}`);
    }
    return await method(options);
  }
  
  async findById(id: string): Promise<T | null> {
    try {
      const model = this.model as Record<string, (options: unknown) => Promise<T | null>>;
      return await model.findUnique({
        where: { id }
      });
    } catch (error) {
      this.handleError('findById', error);
      throw error;
    }
  }
  
  async findMany(options: FindManyOptions<WhereInput> = {}): Promise<T[]> {
    try {
      const { where, orderBy, select, include, take, skip } = options;
      return await this.callModelMethod<T[]>('findMany', {
        where,
        orderBy,
        select,
        include,
        take,
        skip,
      });
    } catch (error) {
      this.handleError('findMany', error);
      throw error;
    }
  }
  
  async findFirst(where: WhereInput): Promise<T | null> {
    try {
      return await this.callModelMethod<T | null>('findFirst', { where });
    } catch (error) {
      this.handleError('findFirst', error);
      throw error;
    }
  }
  
  async create(data: CreateInput): Promise<T> {
    try {
      return await this.callModelMethod<T>('create', { data });
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }
  
  async update(id: string, data: UpdateInput): Promise<T> {
    try {
      return await this.callModelMethod<T>('update', {
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }
  
  async delete(id: string): Promise<T> {
    try {
      return await this.callModelMethod<T>('delete', {
        where: { id },
      });
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    }
  }
  
  async createMany(data: CreateInput[]): Promise<{ count: number }> {
    try {
      return await this.callModelMethod<{ count: number }>('createMany', { data });
    } catch (error) {
      this.handleError('createMany', error);
      throw error;
    }
  }
  
  async updateMany(where: WhereInput, data: UpdateInput): Promise<{ count: number }> {
    try {
      return await this.callModelMethod<{ count: number }>('updateMany', { where, data });
    } catch (error) {
      this.handleError('updateMany', error);
      throw error;
    }
  }
  
  async deleteMany(where: WhereInput): Promise<{ count: number }> {
    try {
      return await this.callModelMethod<{ count: number }>('deleteMany', { where });
    } catch (error) {
      this.handleError('deleteMany', error);
      throw error;
    }
  }
  
  async count(where?: WhereInput): Promise<number> {
    try {
      return await this.callModelMethod<number>('count', { where });
    } catch (error) {
      this.handleError('count', error);
      throw error;
    }
  }
  
  async findManyWithPagination(options: PaginationOptions<WhereInput>): Promise<PaginatedResult<T>> {
    try {
      const { page, limit, where, orderBy, select, include } = options;
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.callModelMethod<T[]>('findMany', {
          where,
          orderBy,
          select,
          include,
          take: limit,
          skip,
        }),
        this.callModelMethod<number>('count', { where }),
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.handleError('findManyWithPagination', error);
      throw error;
    }
  }
  
  async exists(where: WhereInput): Promise<boolean> {
    try {
      const count = await this.callModelMethod<number>('count', { where });
      return count > 0;
    } catch (error) {
      this.handleError('exists', error);
      throw error;
    }
  }
  
  // Transaction support
  async executeInTransaction<R>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<R>
  ): Promise<R> {
    return await this.db.$transaction(fn);
  }
  
  // Raw query support
  async executeRawQuery<R>(query: string, parameters?: unknown[]): Promise<R> {
    try {
      return await this.db.$queryRawUnsafe(query, ...(parameters || []));
    } catch (error) {
      this.handleError('executeRawQuery', error);
      throw error;
    }
  }
  
  // Error handling
  protected handleError(operation: string, error: unknown): void {
    console.error(`${this.modelName} Repository - ${operation} error:`, error);
    
    // Add structured error logging
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Prisma error code: ${error.code}`, error.meta);
    }
  }
  
  // Utility methods for common patterns
  protected buildOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc'): Record<string, string> | undefined {
    if (!sortBy) return undefined;
    
    return {
      [sortBy]: sortOrder || 'asc'
    };
  }
  
  protected buildDateRangeFilter(
    field: string, 
    startDate?: string | Date, 
    endDate?: string | Date
  ): Record<string, { gte?: Date; lte?: Date }> | Record<string, never> {
    const filter: Record<string, { gte?: Date; lte?: Date }> = {};
    
    if (startDate || endDate) {
      filter[field] = {};
      if (startDate) filter[field].gte = new Date(startDate);
      if (endDate) filter[field].lte = new Date(endDate);
    }
    
    return filter;
  }
  
  protected buildSearchFilter(
    fields: string[], 
    searchTerm?: string
  ): { OR: Array<Record<string, { contains: string; mode: string }>> } | Record<string, never> {
    if (!searchTerm || !fields.length) return {};
    
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }))
    };
  }
}

// Repository factory for dependency injection
export class RepositoryFactory {
  private static repositories = new Map<string, unknown>();
  
  static register<T>(name: string, repository: T): void {
    this.repositories.set(name, repository);
  }
  
  static get<T>(name: string): T {
    const repository = this.repositories.get(name);
    if (!repository) {
      throw new Error(`Repository ${name} not found`);
    }
    return repository as T;
  }
  
  static clear(): void {
    this.repositories.clear();
  }
}

// Connection and health check utilities
export class DatabaseHealth {
  static async checkConnection(db: PrismaClient = prisma): Promise<boolean> {
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
  
  static async getConnectionInfo(db: PrismaClient = prisma): Promise<Record<string, unknown>> {
    try {
      const result = await db.$queryRaw`SELECT version() as version, current_database() as database`;
      return result as Record<string, unknown>;
    } catch {
      return { error: 'Failed to get connection info' };
    }
  }
}