const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'YourPassword123!',
  database: 'schedula',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function addTestData() {
  try {
    const pool = await sql.connect(config);
    
    console.log('Adding test services...');
    
    // Check if services already exist
    const existing = await pool.request().query('SELECT COUNT(*) as Count FROM Services');
    if (existing.recordset[0].Count > 0) {
      console.log('Services already exist, skipping...');
      await pool.close();
      return;
    }
    
    // Add test services
    await pool.request().query(`
      INSERT INTO Services (Name, Description, DurationMinutes, Price, IsActive)
      VALUES 
        ('Haircut', 'Professional haircut and styling', 30, 25.00, 1),
        ('Hair Color', 'Full hair coloring service with consultation', 120, 85.00, 1),
        ('Manicure', 'Nail care, shaping, and polish', 45, 35.00, 1),
        ('Pedicure', 'Foot care and nail polish', 60, 45.00, 1),
        ('Massage Therapy', 'Relaxing full-body massage', 60, 75.00, 1),
        ('Facial Treatment', 'Deep cleansing and moisturizing facial', 45, 65.00, 1);
    `);
    
    const result = await pool.request().query('SELECT COUNT(*) as Count FROM Services');
    console.log(`✅ Added ${result.recordset[0].Count} test services!`);
    
    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestData();
