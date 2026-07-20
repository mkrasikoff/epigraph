--liquibase formatted sql
--changeset mkrasikoff:019-create-friendships

-- One row per directed friendship (TASK-129). requester_id sent the request to
-- addressee_id; status is 'PENDING' until the addressee accepts, then 'ACCEPTED'.
-- Decline and "remove friend" both just DELETE the row (no DECLINED/REMOVED state) —
-- deleting a PENDING row lets the pair request again later, and deleting an ACCEPTED
-- row cleanly revokes access with nothing left to reference.
--
-- The unique (requester_id, addressee_id) constraint is *directed*, so in principle
-- both (A,B) and (B,A) could exist (A and B each send a request before either
-- accepts). Collapsing that into a single relationship — accepting B's pending
-- request instead of creating a second row — is enforced in FriendshipService, not
-- here, because the row also has to remember who originally asked. The CHECK keeps a
-- user from friending themselves.
--
-- Both FKs cascade on user delete, so removing an account tears down every friendship
-- it was part of (mirrors 007's cascade for quotes/subscriptions).
CREATE TABLE IF NOT EXISTS friendships (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    created_at BIGINT NOT NULL,
    responded_at BIGINT,
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

-- Listing a user's incoming requests and their accepted friends both filter on the
-- addressee side; the unique constraint above already indexes the requester side.
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
