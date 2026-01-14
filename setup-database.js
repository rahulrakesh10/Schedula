const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'YourPassword123!',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function setupDatabase() {
  try {
    console.log('Connecting to SQL Server...');
    
    // Connect without database first
    const pool = await sql.connect(config);
    
    console.log('Creating database...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'schedula')
      CREATE DATABASE schedula
    `);
    
    console.log('Database created!');
    
    // Close connection
    await pool.close();
    
    // Connect to the new database
    config.database = 'schedula';
    const dbPool = await sql.connect(config);
    
    console.log('Reading schema file...');
    const fs = require('fs');
    const schema = fs.readFileSync('./src/database/schema.sql', 'utf8');
    
    console.log('Running schema...');
    
    // Remove comments
    const cleanedSchema = schema
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Split into individual statements (semicolon or newline separated)
    // But keep triggers together since they need to be in their own batch
    const statements = [];
    let currentStatement = '';
    let inTrigger = false;
    
    const lines = cleanedSchema.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // Detect trigger start
      if (line.toUpperCase().includes('CREATE TRIGGER')) {
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
        inTrigger = true;
        currentStatement = line + '\n';
      }
      // Detect trigger end
      else if (inTrigger && line.toUpperCase().includes('END;')) {
        currentStatement += line + '\n';
        statements.push(currentStatement.trim());
        currentStatement = '';
        inTrigger = false;
      }
      // Regular statement
      else {
        currentStatement += line + '\n';
        if (line.endsWith(';') && !inTrigger) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt && !stmt.match(/^\s*--/)) {
        try {
          await dbPool.request().query(stmt);
          console.log(`  ✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (err) {
          // Some statements might fail if objects already exist, that's okay
          if (!err.message.includes('already exists') && 
              !err.message.includes('already an object') &&
              !err.message.includes('duplicate key')) {
            console.warn(`  ⚠ Statement ${i + 1} warning: ${err.message}`);
          }
        }
      }
    }
    
    console.log('✅ Schema executed successfully!');
    
    // Verify tables were created
    const result = await dbPool.request().query(`
      SELECT COUNT(*) as TableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log(`✅ Created ${result.recordset[0].TableCount} tables`);
    
    await dbPool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
