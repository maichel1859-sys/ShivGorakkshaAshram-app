// Repository exports and factory setup
export * from './base.repository';
export * from './user.repository';
export * from './appointment.repository';

import { UserRepository } from './user.repository';
import { AppointmentRepository } from './appointment.repository';
import { RepositoryFactory } from './base.repository';

// Initialize repositories
const userRepository = new UserRepository();
const appointmentRepository = new AppointmentRepository();

// Register repositories with factory
RepositoryFactory.register('user', userRepository);
RepositoryFactory.register('appointment', appointmentRepository);

// Export repository instances
export const repositories = {
  user: userRepository,
  appointment: appointmentRepository,
};

// Export factory for dependency injection
export { RepositoryFactory } from './base.repository';

// Repository type definitions for dependency injection
export interface IRepositories {
  user: UserRepository;
  appointment: AppointmentRepository;
}

// Utility function to get all repositories
export const getRepositories = (): IRepositories => repositories;

// Health check function for all repositories
export const checkRepositoryHealth = async (): Promise<{
  healthy: boolean;
  repositories: Record<string, boolean>;
}> => {
  const results: Record<string, boolean> = {};
  let allHealthy = true;

  try {
    // Test user repository
    try {
      await repositories.user.count();
      results.user = true;
    } catch {
      results.user = false;
      allHealthy = false;
    }

    // Test appointment repository
    try {
      await repositories.appointment.count();
      results.appointment = true;
    } catch {
      results.appointment = false;
      allHealthy = false;
    }

    return {
      healthy: allHealthy,
      repositories: results,
    };
  } catch {
    return {
      healthy: false,
      repositories: results,
    };
  }
};