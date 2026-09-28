import { InMemoryTodoRepository } from './in-memory-todo.repository';
import { describeTodoRepositoryContract } from './todo-repository.contract';

describeTodoRepositoryContract('InMemoryTodoRepository', () => new InMemoryTodoRepository());
