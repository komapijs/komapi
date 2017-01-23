// Exports
exports.up = (knex, Promise) => Promise.all([
  knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username');
    table.timestamps();
  }),
  knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.timestamps();
  }),
  knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.timestamps();
  }),
]).then(() => Promise.all([
  knex.schema.createTable('roles_users', (table) => {
    table.integer('role_id')
      .references('id')
      .inTable('roles');
    table.integer('user_id')
      .references('id')
      .inTable('users');
    table.timestamps();
    table.unique(['user_id', 'role_id']);
  }),
  knex.schema.createTable('permissions_roles', (table) => {
    table.integer('permission_id')
      .references('id')
      .inTable('permissions');
    table.integer('role_id')
      .references('id')
      .inTable('roles');
    table.timestamps();
    table.unique(['role_id', 'permission_id']);
  }),
]));
exports.down = (knex, Promise) => Promise.all([
  knex.schema.dropTable('permissions_roles'),
  knex.schema.dropTable('roles_users'),
  knex.schema.dropTable('permissions'),
  knex.schema.dropTable('roles'),
  knex.schema.dropTable('users'),
]);
