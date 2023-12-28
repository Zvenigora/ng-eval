# Common Classes
Ng-eval provides a set of common classes for storing and retrieving values.

## Registries
Registries are a way to store and retrieve key-value paired data. Behind the scenes, they are based on JavaScript `Map`. The following registries are provided by the project:
- `BaseRegistry`: A base class for registries,
- `CaseInsensitiveRegistry`: a case-insensitive registry that maps keys to values,
- `Registry`: A generic registry that stores key value pairs. Depends on options it can be case sensitive or insensitive.
- `Cache`: A registry to speed up access. Cache key is a hash based on SHA-256 algorithm.

## Containers
Containers are a way to store and retrieve data. The following containers are provided by Ng-eval:
- `Queue`: A generic queue data structure with FIFO behavior,
- `Stack`: A generic stack data structure with LIFO behavior.
- `BaseContext`: A simple class for storing key-value pairs.
- `Context`: A container which could be a base context or registry.

