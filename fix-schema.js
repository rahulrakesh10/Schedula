const sql = require('mssql');
const fs = require('fs');

const config = {
  server: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'YourPassword123!',
  database: 'schedula',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function fixSchema() {
  try {
    const pool = await sql.connect(config);
    
    console.log('Creating Bookings table with fixed syntax...');
    
    // Drop if exists
    await pool.request().query(`
      IF OBJECT_ID('dbo.Bookings', 'U') IS NOT NULL
        DROP TABLE dbo.Bookings;
    `).catch(() => {});
    
    // Create Bookings table (Azure SQL Edge uses NO ACTION instead of RESTRICT)
    await pool.request().query(`
      CREATE TABLE [dbo].[Bookings] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [ServiceId] UNIQUEIDENTIFIER NOT NULL,
        [StartTime] DATETIME2 NOT NULL,
        [EndTime] DATETIME2 NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Confirmed' CHECK ([Status] IN ('Confirmed', 'Cancelled', 'Completed')),
        [Notes] NVARCHAR(MAX),
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_Bookings_Users FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_Bookings_Services FOREIGN KEY ([ServiceId]) REFERENCES [dbo].[Services]([Id]) ON DELETE NO ACTION,
        CONSTRAINT CK_Bookings_TimeRange CHECK ([EndTime] > [StartTime]),
        INDEX IX_Bookings_UserId ([UserId]),
        INDEX IX_Bookings_ServiceId ([ServiceId]),
        INDEX IX_Bookings_StartTime ([StartTime]),
        INDEX IX_Bookings_Status ([Status]),
        INDEX IX_Bookings_TimeRange_Status ([StartTime], [EndTime], [Status])
      );
    `);
    
    console.log('Dropping existing triggers...');
    
    // Drop existing triggers if they exist
    await pool.request().query(`
      IF OBJECT_ID('dbo.TR_Users_UpdatedAt', 'TR') IS NOT NULL
        DROP TRIGGER [dbo].[TR_Users_UpdatedAt];
    `).catch(() => {});
    
    await pool.request().query(`
      IF OBJECT_ID('dbo.TR_Services_UpdatedAt', 'TR') IS NOT NULL
        DROP TRIGGER [dbo].[TR_Services_UpdatedAt];
    `).catch(() => {});
    
    await pool.request().query(`
      IF OBJECT_ID('dbo.TR_Bookings_UpdatedAt', 'TR') IS NOT NULL
        DROP TRIGGER [dbo].[TR_Bookings_UpdatedAt];
    `).catch(() => {});
    
    console.log('Creating triggers...');
    
    // Create triggers one by one
    await pool.request().query(`
      CREATE TRIGGER [dbo].[TR_Users_UpdatedAt]
      ON [dbo].[Users]
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE [dbo].[Users]
        SET [UpdatedAt] = GETUTCDATE()
        FROM [dbo].[Users] u
        INNER JOIN inserted i ON u.[Id] = i.[Id];
      END;
    `);
    
    await pool.request().query(`
      CREATE TRIGGER [dbo].[TR_Services_UpdatedAt]
      ON [dbo].[Services]
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE [dbo].[Services]
        SET [UpdatedAt] = GETUTCDATE()
        FROM [dbo].[Services] s
        INNER JOIN inserted i ON s.[Id] = i.[Id];
      END;
    `);
    
    await pool.request().query(`
      CREATE TRIGGER [dbo].[TR_Bookings_UpdatedAt]
      ON [dbo].[Bookings]
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE [dbo].[Bookings]
        SET [UpdatedAt] = GETUTCDATE()
        FROM [dbo].[Bookings] b
        INNER JOIN inserted i ON b.[Id] = i.[Id];
      END;
    `);
    
    // Verify
    const result = await pool.request().query(`
      SELECT COUNT(*) as TableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log(`✅ Success! Created ${result.recordset[0].TableCount} tables`);
    
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('Tables:', tables.recordset.map(r => r.TABLE_NAME).join(', '));
    
    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
