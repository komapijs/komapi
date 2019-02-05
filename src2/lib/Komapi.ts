// Imports
import Koa from 'koa';
import { DeepPartial } from 'ts-essentials';
import BaseService from './Service';

/**
 * Overload Koa by extending Komapi for simple module augmentation
 */
declare module 'koa' {
  interface Application<StateT = any, CustomT = {}> extends Komapi<StateT, CustomT> {}
}

/**
 * Komapi class
 */
class Komapi<StateT = any, CustomT = {}> extends Koa<StateT, CustomT> {
  /**
   * Export helper functions by attaching to Komapi (hack to make it work with named import and module augmentation)
   */
  public static Service = BaseService;

  /**
   * Properties
   */
  public readonly services: Komapi.Services;

  /**
   * Create new Komapi instance
   *
   * @param {Komapi.Services} services
   */
  constructor(services: Komapi.Services) {
    super();

    /**
     * Initialization
     */
    {
      this.services = Object.entries(services).reduce(
        (acc, [k, v]: [string, any]) => {
          acc[k] = new v(this);
          return acc;
        },
        {} as any,
      );
    }
  }
}

/**
 * Namespace
 */
declare namespace Komapi {
  export type InstantiatedServices<Service extends BaseService = BaseService> = { [P in keyof Services<Service>]: InstanceType<Services<Service>[P]> };
  export type ConstructableService<T extends BaseService = BaseService> = new (...args: any[]) => T;

  // User customizable types
  export interface Services<Service extends BaseService = BaseService> {
    [name: string]: ConstructableService<Service>;
  }
}

// Exports
export = Komapi;
