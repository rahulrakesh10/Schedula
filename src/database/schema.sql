-- Schedula Database Schema
-- Azure SQL Database Schema for Booking and Scheduling System

-- Users Table
CREATE TABLE [dbo].[Users] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [Email] NVARCHAR(255) NOT NULL UNIQUE,
    [PasswordHash] NVARCHAR(255) NOT NULL,
    [FullName] NVARCHAR(255) NOT NULL,
    [Role] NVARCHAR(50) NOT NULL CHECK ([Role] IN ('Admin', 'Client')),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX IX_Users_Email ([Email]),
    INDEX IX_Users_Role ([Role])
);

-- Services Table
CREATE TABLE [dbo].[Services] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [Name] NVARCHAR(255) NOT NULL,
    [Description] NVARCHAR(MAX),
    [DurationMinutes] INT NOT NULL CHECK ([DurationMinutes] > 0),
    [Price] DECIMAL(10, 2) NOT NULL CHECK ([Price] >= 0),
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    INDEX IX_Services_IsActive ([IsActive])
);

-- Bookings Table
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
    CONSTRAINT FK_Bookings_Services FOREIGN KEY ([ServiceId]) REFERENCES [dbo].[Services]([Id]) ON DELETE RESTRICT,
    CONSTRAINT CK_Bookings_TimeRange CHECK ([EndTime] > [StartTime]),
    INDEX IX_Bookings_UserId ([UserId]),
    INDEX IX_Bookings_ServiceId ([ServiceId]),
    INDEX IX_Bookings_StartTime ([StartTime]),
    INDEX IX_Bookings_Status ([Status]),
    -- Composite index for efficient conflict detection
    INDEX IX_Bookings_TimeRange_Status ([StartTime], [EndTime], [Status])
);

-- Trigger to update UpdatedAt timestamp
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


