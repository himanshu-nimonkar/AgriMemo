# DESIGN_ANSWERS.md

### Q1: Supporting many note types?
AgriMemo uses a **Dynamic Schema Registry**. Adding a new type just requires a key in `structuring_engine.py`. Schema B acts as a "catch-all" for types not yet formally registered.

### Q2: Predefined vs AI schemas?
Predefined (Schema A) is for reliable integration; AI-generated (Schema B) is for flexibility. AgriMemo runs both in parallel to ensure no data loss while maintaining strict structure where possible.

### Q3: Scaling to volume?
Current `BackgroundTasks` implementation allows the web server to accept volume quickly. For massive scale, moving the ingestion to a Redis/RabbitMQ queue with dedicated workers is the clear path forward.

### Q4: GPS and Spatial Context?
New in v3.0, we capture GPS coordinates via the browser. This turns voice notes from "what happened" into "what happened where," enabling future map-based analytics for field operations.
