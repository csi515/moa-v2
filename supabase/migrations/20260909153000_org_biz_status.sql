alter table core.organizations
  add column if not exists biz_status text,
  add column if not exists biz_checked_at timestamptz;

comment on column core.organizations.biz_status is '국세청 납세자상태 01 계속 02 휴업 03 폐업';
comment on column core.organizations.biz_checked_at is '국세청 상태 마지막 조회 시각';
