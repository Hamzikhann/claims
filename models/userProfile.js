'use strict';

module.exports = (sequelize, DataTypes) => {
  const table = sequelize.define('userProfiles', {
    jobTitle: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    skype: DataTypes.STRING,
    address: DataTypes.STRING, 
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    zipcode: DataTypes.STRING,
    country: DataTypes.STRING,
    isActive: {
      type: DataTypes.STRING,  
      allowNull: false, 
      defaultValue: 'Y'
    },
  }, { timestamps: true });
  table.associate = function (models) {
    table.belongsTo(models.users)
  };
  return table;
};