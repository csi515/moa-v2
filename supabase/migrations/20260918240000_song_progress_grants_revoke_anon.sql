-- 완곡 스탬프: table GRANT + RPC anon/public EXECUTE 회수
-- fresh env 및 보안 hardening 정합

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE piano.song_progress TO authenticated;

REVOKE ALL ON FUNCTION piano.grant_song_stamp_direct(UUID, UUID, TEXT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION piano.grant_song_stamp_direct(UUID, UUID, TEXT, TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION piano.grant_song_stamp_direct(UUID, UUID, TEXT, TEXT, INT) TO authenticated;

REVOKE ALL ON FUNCTION piano.request_song_completion(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION piano.request_song_completion(UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION piano.request_song_completion(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION piano.approve_song_progress(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION piano.approve_song_progress(UUID, INT) FROM anon;
GRANT EXECUTE ON FUNCTION piano.approve_song_progress(UUID, INT) TO authenticated;

REVOKE ALL ON FUNCTION piano.approve_song_progress_bulk(UUID[], INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION piano.approve_song_progress_bulk(UUID[], INT) FROM anon;
GRANT EXECUTE ON FUNCTION piano.approve_song_progress_bulk(UUID[], INT) TO authenticated;
