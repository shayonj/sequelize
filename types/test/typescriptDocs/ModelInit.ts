/**
 * Keep this file in sync with the code in the "Usage" section in typescript.md
 */
import {
  Association, DataTypes, HasManyAddAssociationMixin, HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, Model,
  ModelDefined, Optional, Sequelize
} from "sequelize";

const sequelize = new Sequelize("mysql://root:asd123@localhost:3306/mydb");

// These are all the attributes in the User model
interface UserAttributes {
  id: number;
  name: string;
  preferredName: string | null;
}

// Some attributes are optional in `User.build` and `User.create` calls
interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  declare id: number; // Note that the `null assertion` `!` is required in strict mode.
  declare name: string;
  declare preferredName: string | null; // for nullable fields

  // timestamps!
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getProjects: HasManyGetAssociationsMixin<Project>; // Note the null assertions!
  declare addProject: HasManyAddAssociationMixin<Project, number>;
  declare hasProject: HasManyHasAssociationMixin<Project, number>;
  declare countProjects: HasManyCountAssociationsMixin;
  declare createProject: HasManyCreateAssociationMixin<Project, 'ownerId'>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  declare readonly projects?: Project[]; // Note this is optional since it's only populated when explicitly requested in code

  declare static associations: {
    projects: Association<User, Project>;
  };
}

interface ProjectAttributes {
  id: number;
  ownerId: number;
  name: string;
  description?: string;
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes, "id"> {}

class Project extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes {
  declare id: number;
  declare ownerId: number;
  declare name: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

interface AddressAttributes {
  userId: number;
  address: string;
}

// You can write `extends Model<AddressAttributes, AddressAttributes>` instead,
// but that will do the exact same thing as below
class Address extends Model<AddressAttributes> implements AddressAttributes {
  declare userId: number;
  declare address: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// You can also define modules in a functional way
interface NoteAttributes {
  id: number;
  title: string;
  content: string;
}

// You can also set multiple attributes optional at once
interface NoteCreationAttributes
  extends Optional<NoteAttributes, "id" | "title"> {}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    name: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    description: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "projects",
  }
);

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    preferredName: {
      type: new DataTypes.STRING(128),
      allowNull: true,
    },
  },
  {
    tableName: "users",
    sequelize, // passing the `sequelize` instance is required
  }
);

Address.init(
  {
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
    },
    address: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
  },
  {
    tableName: "address",
    sequelize, // passing the `sequelize` instance is required
  }
);

// And with a functional approach defining a module looks like this
const Note: ModelDefined<
  NoteAttributes,
  NoteCreationAttributes
> = sequelize.define(
  "Note",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: new DataTypes.STRING(64),
      defaultValue: "Unnamed Note",
    },
    content: {
      type: new DataTypes.STRING(4096),
      allowNull: false,
    },
  },
  {
    tableName: "notes",
  }
);

// Here we associate which actually populates out pre-declared `association` static and other methods.
User.hasMany(Project, {
  sourceKey: "id",
  foreignKey: "ownerId",
  as: "projects", // this determines the name in `associations`!
});

Address.belongsTo(User, { targetKey: "id" });
User.hasOne(Address, { sourceKey: "id" });

async function doStuffWithUser() {
  const newUser = await User.create({
    name: "Johnny",
    preferredName: "John",
  });
  console.log(newUser.id, newUser.name, newUser.preferredName);

  const project = await newUser.createProject({
    name: "first!",
  });

  const ourUser = await User.findByPk(1, {
    include: [User.associations.projects],
    rejectOnEmpty: true, // Specifying true here removes `null` from the return type!
  });

  // Note the `!` null assertion since TS can't know if we included
  // the model or not
  console.log(ourUser.projects![0].name);
}

(async () => {
  await sequelize.sync();
  await doStuffWithUser();
})();
