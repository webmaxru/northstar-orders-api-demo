# Architecture

Northstar Orders API is a stateless HTTP service deployed as multiple instances behind a load balancer.

## Runtime boundaries

- Any retry can reach a different process.
- Process memory is not shared and is lost on restart.
- PostgreSQL is the shared durability and concurrency boundary.
- The API must remain safe when two instances receive the same request concurrently.

## Delivery boundaries

- Issues capture intent and acceptance criteria.
- Pull requests capture the plan, implementation, evidence, and decisions.
- GitHub Actions provides independent build, test, dependency, and CodeQL signals.
- Humans approve schema, workflow, dependency, permission, and merge decisions.

## Privacy

Raw idempotency keys and request payloads are sensitive correlation data. Store only hashes and do not write either value to logs.

