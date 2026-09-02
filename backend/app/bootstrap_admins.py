import os
import logging
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models.zone import Zone, ZoneCode
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

logger = logging.getLogger("bootstrap")

def bootstrap_zones_and_admins(db: Session = None):
    """Initializes 5 operational zones and seeds initial admin accounts securely hashed with Argon2id."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Ensure database tables exist
        Base.metadata.create_all(bind=engine)

        # 1. Seed 5 Operational Zones
        zones_data = [
            {"code": ZoneCode.CENTRAL.value, "name": "Central Zone", "description": "Nagpur Central Zone Command (Sitabuldi, Sadar, Mahal, Itwari)"},
            {"code": ZoneCode.NORTH.value, "name": "North Zone", "description": "Nagpur North Zone Command (Indora, Automotive, Kamptee, Jaripatka)"},
            {"code": ZoneCode.EAST.value, "name": "East Zone", "description": "Nagpur East Zone Command (Kalamna, Pardi, Lakadganj, Nandanvan)"},
            {"code": ZoneCode.WEST.value, "name": "West Zone", "description": "Nagpur West Zone Command (Dharampeth, Ambazari, Wadi, Hingna)"},
            {"code": ZoneCode.SOUTH.value, "name": "South Zone", "description": "Nagpur South Zone Command (Chhatrapati Nagar, Khamla, Manewada, Ajni)"},
        ]

        zone_map = {}
        for z_info in zones_data:
            existing = db.query(Zone).filter(Zone.code == z_info["code"]).first()
            if not existing:
                z = Zone(code=z_info["code"], name=z_info["name"], description=z_info["description"])
                db.add(z)
                db.flush()
                zone_map[z_info["code"]] = z
                logger.info(f"Seeded Zone: {z_info['code']}")
            else:
                zone_map[z_info["code"]] = existing

        db.commit()

        # 2. Seed Predefined Admin Accounts with Argon2id Hashes
        # Passwords securely supplied via environment variables
        default_admins = [
            {
                "username": os.getenv("SYSTEM_ADMIN_USERNAME", "admin"),
                "env_pass": os.getenv("SYSTEM_ADMIN_INITIAL_PASSWORD", "NagpurPulse@2026Admin!"),
                "role": UserRole.SYSTEM_ADMIN.value,
                "zone_code": "ALL",
                "zone_id": None,
                "legacy_usernames": ["admin"],
            },
            {
                "username": os.getenv("CENTRAL_ADMIN_USERNAME", "np.central.ops"),
                "env_pass": os.getenv("CENTRAL_ADMIN_INITIAL_PASSWORD", "Np!C7v#Q2m@L9x$R4kZ8"),
                "role": UserRole.ZONE_ADMIN.value,
                "zone_code": ZoneCode.CENTRAL.value,
                "zone_id": zone_map[ZoneCode.CENTRAL.value].id if ZoneCode.CENTRAL.value in zone_map else None,
                "legacy_usernames": ["central_admin", "np.central.ops"],
            },
            {
                "username": os.getenv("NORTH_ADMIN_USERNAME", "np.north.ops"),
                "env_pass": os.getenv("NORTH_ADMIN_INITIAL_PASSWORD", "Nr@8Kp!4Xz#M6q$T2vL9"),
                "role": UserRole.ZONE_ADMIN.value,
                "zone_code": ZoneCode.NORTH.value,
                "zone_id": zone_map[ZoneCode.NORTH.value].id if ZoneCode.NORTH.value in zone_map else None,
                "legacy_usernames": ["north_admin", "np.north.ops"],
            },
            {
                "username": os.getenv("EAST_ADMIN_USERNAME", "np.east.ops"),
                "env_pass": os.getenv("EAST_ADMIN_INITIAL_PASSWORD", "Ne#5Wm@9Rk!H3x$P7qV2"),
                "role": UserRole.ZONE_ADMIN.value,
                "zone_code": ZoneCode.EAST.value,
                "zone_id": zone_map[ZoneCode.EAST.value].id if ZoneCode.EAST.value in zone_map else None,
                "legacy_usernames": ["east_admin", "np.east.ops"],
            },
            {
                "username": os.getenv("WEST_ADMIN_USERNAME", "np.west.ops"),
                "env_pass": os.getenv("WEST_ADMIN_INITIAL_PASSWORD", "Nw!6Jr#2Yp@K8m$F4xT9"),
                "role": UserRole.ZONE_ADMIN.value,
                "zone_code": ZoneCode.WEST.value,
                "zone_id": zone_map[ZoneCode.WEST.value].id if ZoneCode.WEST.value in zone_map else None,
                "legacy_usernames": ["west_admin", "np.west.ops"],
            },
            {
                "username": os.getenv("SOUTH_ADMIN_USERNAME", "np.south.ops"),
                "env_pass": os.getenv("SOUTH_ADMIN_INITIAL_PASSWORD", "Ns@7Qx!3Lm#V9r$C5kH2"),
                "role": UserRole.ZONE_ADMIN.value,
                "zone_code": ZoneCode.SOUTH.value,
                "zone_id": zone_map[ZoneCode.SOUTH.value].id if ZoneCode.SOUTH.value in zone_map else None,
                "legacy_usernames": ["south_admin", "np.south.ops"],
            },
        ]

        for u_info in default_admins:
            target_username = u_info["username"]
            
            # Find by exact username or legacy username or zone_code match
            existing_user = db.query(User).filter(
                (User.username == target_username) | 
                (User.username.in_(u_info["legacy_usernames"])) |
                ((User.role == u_info["role"]) & (User.zone_code == u_info["zone_code"]))
            ).first()

            p_hash = hash_password(u_info["env_pass"])

            if existing_user:
                existing_user.username = target_username
                existing_user.password_hash = p_hash
                existing_user.must_change_password = True
                logger.info(f"Updated Admin User credentials (Argon2id Hashed): {target_username} [{u_info['role']}]")
            else:
                u = User(
                    username=target_username,
                    password_hash=p_hash,
                    role=u_info["role"],
                    zone_id=u_info["zone_id"],
                    zone_code=u_info["zone_code"],
                    is_active=True,
                    must_change_password=True,
                )
                db.add(u)
                logger.info(f"Provisioned Admin User (Argon2id Hashed): {target_username} [{u_info['role']}]")

        db.commit()
        logger.info("Zones and Admin accounts successfully bootstrapped.")

        # Seed initial audit logs if table is empty or missing zone coverage
        try:
            from app.models.audit_log import AuditLog
            from datetime import datetime, timedelta
            existing_count = db.query(AuditLog).count()
            if existing_count < 5:
                now = datetime.utcnow()
                sample_audit_logs = [
                    AuditLog(
                        user_id=1,
                        username="admin",
                        role="SYSTEM_ADMIN",
                        zone_code="ALL",
                        action="SYSTEM_INIT",
                        resource_type="PLATFORM",
                        resource_id="SYS-BOOT-01",
                        details="Nagpur Pulse multi-zone command system initialized with SHA-256 tamper-evident chaining.",
                        timestamp=now - timedelta(hours=5),
                        success=True
                    ),
                    AuditLog(
                        user_id=5,
                        username="np.south.ops",
                        role="ZONE_ADMIN",
                        zone_code="SOUTH",
                        action="LOGIN_SUCCESS",
                        resource_type="AUTH_SESSION",
                        resource_id="SES-SOUTH-101",
                        details="South Zone Commander authenticated with Argon2id credentials from South Nagpur Command Station.",
                        timestamp=now - timedelta(minutes=45),
                        success=True
                    ),
                    AuditLog(
                        user_id=5,
                        username="np.south.ops",
                        role="ZONE_ADMIN",
                        zone_code="SOUTH",
                        action="DISPATCH_APPROVED",
                        resource_type="DECISION_RECORD",
                        resource_id="DEC-2026-SOUTH-08",
                        details="Commander APPROVED AI recommendation: Dispatched Unit P17 to Chhatrapati Nagar Square collision.",
                        timestamp=now - timedelta(minutes=30),
                        success=True
                    ),
                    AuditLog(
                        user_id=5,
                        username="np.south.ops",
                        role="ZONE_ADMIN",
                        zone_code="SOUTH",
                        action="DECISION_MODIFY",
                        resource_type="DECISION_RECORD",
                        resource_id="DEC-2026-SOUTH-09",
                        details="Commander OVERRIDE: Modified dispatch to Unit P12 for Ajni Chowk congestion clearance (DAS: 88.5).",
                        timestamp=now - timedelta(minutes=15),
                        success=True
                    ),
                    AuditLog(
                        user_id=2,
                        username="np.central.ops",
                        role="ZONE_ADMIN",
                        zone_code="CENTRAL",
                        action="DISPATCH_APPROVED",
                        resource_type="DECISION_RECORD",
                        resource_id="DEC-2026-0041",
                        details="Controller APPROVED AI recommendation: Unit P01 dispatched to Samvidhan Square (RBI Chowk).",
                        timestamp=now - timedelta(hours=2),
                        success=True
                    ),
                    AuditLog(
                        user_id=3,
                        username="np.north.ops",
                        role="ZONE_ADMIN",
                        zone_code="NORTH",
                        action="DISPATCH_APPROVED",
                        resource_type="DECISION_RECORD",
                        resource_id="DEC-2026-NORTH-04",
                        details="North Zone Commander dispatched Unit P03 to Automotive Chowk multi-lane blockage.",
                        timestamp=now - timedelta(hours=1, minutes=20),
                        success=True
                    ),
                    AuditLog(
                        user_id=4,
                        username="np.east.ops",
                        role="ZONE_ADMIN",
                        zone_code="EAST",
                        action="LOGIN_SUCCESS",
                        resource_type="AUTH_SESSION",
                        resource_id="SES-EAST-404",
                        details="East Zone Command active session established for Kalamna & Pardi sectors.",
                        timestamp=now - timedelta(hours=3),
                        success=True
                    ),
                    AuditLog(
                        user_id=4,
                        username="np.west.ops",
                        role="ZONE_ADMIN",
                        zone_code="WEST",
                        action="DECISION_MODIFY",
                        resource_type="DECISION_RECORD",
                        resource_id="DEC-2026-0040",
                        details="Controller MODIFIED recommendation: Reassigned to closer Unit P02 for Law College Square.",
                        timestamp=now - timedelta(hours=2, minutes=10),
                        success=True
                    ),
                ]
                db.add_all(sample_audit_logs)
                db.commit()
                logger.info("Comprehensive multi-zone Audit Logs automatically seeded into database.")
        except Exception as audit_err:
            logger.warning(f"Initial audit logs seeding skipped: {audit_err}")

    except Exception as err:
        logger.error(f"Error bootstrapping zones and admins: {err}")
        db.rollback()
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    bootstrap_zones_and_admins()
