-- 🚀 Enhanced Supabase Schema for Espen D6 MCP Server
-- Optimized for D6 API structure and MCP performance

-- 🏫 Tenants (Schools) - Enhanced with D6 integration metadata
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  d6_school_code TEXT UNIQUE, -- Maps to D6 school identifier
  d6_api_endpoint TEXT, -- School-specific D6 API base URL
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 👤 Users - Aligned with D6 user types and enhanced indexing
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  d6_user_id TEXT, -- Corresponds to D6 learner/staff/parent ID
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('learner', 'teacher', 'parent', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 🎓 Learners - Enhanced with calculated metrics and D6 mapping
CREATE TABLE learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  d6_learner_id TEXT NOT NULL, -- D6 primary key
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade_level INTEGER,
  language_of_instruction TEXT,
  class_name TEXT,
  enrollment_date DATE,
  
  -- 📊 Calculated Academic Metrics (updated by triggers)
  overall_average DECIMAL(5,2),
  term_average DECIMAL(5,2),
  attendance_percentage DECIMAL(5,2),
  subjects_count INTEGER DEFAULT 0,
  discipline_incidents_count INTEGER DEFAULT 0,
  
  -- 🔄 Sync metadata
  last_synced_at TIMESTAMP DEFAULT NOW(),
  d6_last_modified TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, d6_learner_id)
);

-- 📚 Subjects - Enhanced with hierarchy and categorization
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  d6_subject_id TEXT,
  name TEXT NOT NULL,
  subject_code TEXT,
  category TEXT, -- e.g., 'Mathematics', 'Languages', 'Sciences'
  learning_area TEXT, -- e.g., 'STEM', 'Humanities', 'Arts'
  grade_level INTEGER,
  is_core_subject BOOLEAN DEFAULT false,
  credit_hours DECIMAL(3,1),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, d6_subject_id)
);

-- 📋 Subject Enrollments - Links learners to subjects per term
CREATE TABLE subject_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  term INTEGER NOT NULL,
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  teacher_name TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, learner_id, subject_id, term, academic_year)
);

-- 📊 Marks - Enhanced with statistical calculations
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  term INTEGER NOT NULL,
  academic_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  
  -- 🎯 Mark details
  mark_value DECIMAL(5,2) NOT NULL,
  mark_type TEXT, -- 'assignment', 'test', 'exam', 'project'
  total_marks DECIMAL(5,2),
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_marks > 0 THEN (mark_value / total_marks) * 100 ELSE NULL END
  ) STORED,
  
  -- 📈 Statistical context (calculated by triggers)
  class_average DECIMAL(5,2),
  grade_average DECIMAL(5,2),
  class_rank INTEGER,
  grade_rank INTEGER,
  
  assessment_date DATE,
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 📅 Attendance - Comprehensive tracking beyond just absences
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  
  -- 🕐 Detailed attendance status
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused', 'early_departure')) NOT NULL,
  late_arrival_time TIME,
  early_departure_time TIME,
  absence_reason TEXT,
  excused_reason TEXT,
  
  -- 📝 Additional context
  period_number INTEGER, -- For schools with period-based tracking
  subject_id UUID REFERENCES subjects(id),
  notes TEXT,
  
  recorded_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, learner_id, attendance_date, period_number)
);

-- ⚠️ Discipline - Behavior tracking with severity levels
CREATE TABLE discipline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
  
  incident_date DATE NOT NULL,
  incident_type TEXT NOT NULL,
  severity_level TEXT CHECK (severity_level IN ('minor', 'moderate', 'major', 'severe')) NOT NULL,
  description TEXT,
  action_taken TEXT,
  
  -- 👨‍🏫 Staff involvement
  reported_by TEXT,
  handled_by TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- 📧 Parent notification
  parent_notified BOOLEAN DEFAULT false,
  notification_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 👥 Staff Members - Teacher and admin information
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  d6_staff_id TEXT,
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  staff_number TEXT,
  department TEXT,
  position TEXT,
  subjects_taught TEXT[], -- Array of subject names/codes
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, d6_staff_id)
);

-- 👨‍👩‍👧‍👦 Parents - Parent/guardian information
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  d6_parent_id TEXT,
  
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship_type TEXT, -- 'mother', 'father', 'guardian', etc.
  phone_number TEXT,
  email TEXT,
  address TEXT,
  
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, d6_parent_id)
);

-- 👪 Learner-Parent Relationships
CREATE TABLE learner_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  relationship_type TEXT,
  is_primary_contact BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, learner_id, parent_id)
);

-- 💾 Context Cache - Pre-built MCP contexts with TTL
CREATE TABLE context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  context_type TEXT NOT NULL, -- 'learner', 'teacher', 'parent'
  context_data JSONB NOT NULL,
  
  -- ⏰ Cache management
  expires_at TIMESTAMP NOT NULL,
  cache_key TEXT UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_at TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

-- 📋 Sync Logs - Comprehensive audit trail
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
  endpoint TEXT NOT NULL, -- D6 API endpoint called
  status TEXT CHECK (status IN ('success', 'error', 'partial')) NOT NULL,
  
  -- 📊 Sync statistics
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- ⏱️ Performance metrics
  duration_ms INTEGER,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  
  -- 🐛 Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 🔍 Performance Indexes
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_learners_tenant_grade ON learners(tenant_id, grade_level);
CREATE INDEX idx_learners_tenant_d6_id ON learners(tenant_id, d6_learner_id);
CREATE INDEX idx_marks_learner_term ON marks(learner_id, term, academic_year);
CREATE INDEX idx_marks_subject_term ON marks(subject_id, term, academic_year);
CREATE INDEX idx_attendance_learner_date ON attendance(learner_id, attendance_date);
CREATE INDEX idx_attendance_tenant_date ON attendance(tenant_id, attendance_date);
CREATE INDEX idx_discipline_learner_date ON discipline(learner_id, incident_date);
CREATE INDEX idx_context_cache_key ON context_cache(cache_key);
CREATE INDEX idx_context_cache_expires ON context_cache(expires_at);
CREATE INDEX idx_sync_logs_tenant_status ON sync_logs(tenant_id, status, started_at);

-- 🕒 TTL cleanup for cache (runs every hour)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM context_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 📊 Function to calculate learner metrics
CREATE OR REPLACE FUNCTION update_learner_metrics(learner_uuid UUID)
RETURNS void AS $$
DECLARE
    avg_mark DECIMAL(5,2);
    attendance_pct DECIMAL(5,2);
    subject_cnt INTEGER;
    discipline_cnt INTEGER;
BEGIN
    -- Calculate overall average from marks
    SELECT COALESCE(AVG(percentage), 0)
    INTO avg_mark
    FROM marks 
    WHERE learner_id = learner_uuid;
    
    -- Calculate attendance percentage (last 30 days)
    SELECT COALESCE(
        (COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0 / 
         NULLIF(COUNT(*), 0)), 100
    )
    INTO attendance_pct
    FROM attendance 
    WHERE learner_id = learner_uuid 
    AND attendance_date >= NOW() - INTERVAL '30 days';
    
    -- Count active subjects
    SELECT COUNT(DISTINCT subject_id)
    INTO subject_cnt
    FROM subject_enrollments 
    WHERE learner_id = learner_uuid;
    
    -- Count discipline incidents (last 90 days)
    SELECT COUNT(*)
    INTO discipline_cnt
    FROM discipline 
    WHERE learner_id = learner_uuid 
    AND incident_date >= NOW() - INTERVAL '90 days';
    
    -- Update learner record
    UPDATE learners 
    SET 
        overall_average = avg_mark,
        attendance_percentage = attendance_pct,
        subjects_count = subject_cnt,
        discipline_incidents_count = discipline_cnt,
        updated_at = NOW()
    WHERE id = learner_uuid;
END;
$$ LANGUAGE plpgsql;

-- 🔄 Triggers to maintain calculated fields
CREATE OR REPLACE FUNCTION trigger_update_learner_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update metrics for affected learner
    IF TG_OP = 'DELETE' THEN
        PERFORM update_learner_metrics(OLD.learner_id);
        RETURN OLD;
    ELSE
        PERFORM update_learner_metrics(NEW.learner_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_marks_update_metrics
    AFTER INSERT OR UPDATE OR DELETE ON marks
    FOR EACH ROW EXECUTE FUNCTION trigger_update_learner_metrics();

CREATE TRIGGER trigger_attendance_update_metrics
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW EXECUTE FUNCTION trigger_update_learner_metrics();

CREATE TRIGGER trigger_discipline_update_metrics
    AFTER INSERT OR UPDATE OR DELETE ON discipline
    FOR EACH ROW EXECUTE FUNCTION trigger_update_learner_metrics();

-- 🔐 Row Level Security (RLS) Policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_learners ON learners
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_marks ON marks
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_attendance ON attendance
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_discipline ON discipline
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation_context_cache ON context_cache
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- 📅 Schedule cache cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cache-cleanup', '0 * * * *', 'SELECT cleanup_expired_cache();');

-- 🎯 Sample data for testing (optional - remove in production)
-- INSERT INTO tenants (name, d6_school_code) VALUES ('Demo School', 'DEMO001');

COMMENT ON TABLE tenants IS 'School/tenant information with D6 integration metadata';
COMMENT ON TABLE users IS 'Multi-role users with tenant scoping';
COMMENT ON TABLE learners IS 'Enhanced learner profiles with calculated metrics';
COMMENT ON TABLE marks IS 'Academic marks with statistical calculations';
COMMENT ON TABLE attendance IS 'Comprehensive attendance tracking';
COMMENT ON TABLE context_cache IS 'Pre-built MCP contexts with TTL for performance';
COMMENT ON TABLE sync_logs IS 'Audit trail of D6 API synchronization'; 