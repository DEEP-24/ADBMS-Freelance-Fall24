import { faker } from "@faker-js/faker";
import {
  DocumentType,
  PaymentMethod,
  PostStatus,
  PrismaClient,
  ProjectStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const hashedPassword = await bcrypt.hash("password", 10);

async function seed() {
  // Delete existing data
  await db.feedback.deleteMany();
  await db.document.deleteMany();
  await db.payment.deleteMany();
  await db.project.deleteMany();
  await db.bid.deleteMany();
  await db.post.deleteMany();
  await db.categories.deleteMany();
  await db.editor.deleteMany();
  await db.customer.deleteMany();
  await db.admin.deleteMany();

  // Create an admin
  await db.admin.create({
    data: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      dob: faker.date.past(),
      phoneNo: "0987654213",
      address: faker.address.streetAddress(),
      email: "admin@app.com",
      password: hashedPassword,
    },
  });

  // Create a customer
  const customer = await db.customer.create({
    data: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      dob: faker.date.past(),
      phoneNo: "0712345678",
      address: faker.address.streetAddress(),
      email: "customer@app.com",
      password: hashedPassword,
    },
  });

  // Create an editor
  const editor = await db.editor.create({
    data: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      dob: faker.date.past(),
      phoneNo: "0987612345",
      address: faker.address.streetAddress(),
      email: "editor@app.com",
      password: hashedPassword,
      skills: "Editing, Proofreading",
      experience: "5 years",
      portfolio: "https://example.com/portfolio",
      awards: "Best Editor 2022",
    },
  });

  // Create categories
  const categories = await Promise.all([
    db.categories.create({
      data: {
        name: "General Editing",
        description: "Comprehensive editing services for various types of content",
      },
    }),
    db.categories.create({
      data: {
        name: "Academic Editing",
        description: "Specialized editing for academic papers, theses, and dissertations",
      },
    }),
    db.categories.create({
      data: {
        name: "Fiction Editing",
        description: "Editing services tailored for novels, short stories, and creative writing",
      },
    }),
    db.categories.create({
      data: {
        name: "Technical Writing",
        description: "Editing for technical documents, manuals, and scientific papers",
      },
    }),
    db.categories.create({
      data: {
        name: "Business Writing",
        description:
          "Editing services for business reports, proposals, and corporate communications",
      },
    }),
    db.categories.create({
      data: {
        name: "ESL Editing",
        description: "Specialized editing for non-native English speakers",
      },
    }),
    db.categories.create({
      data: {
        name: "Proofreading",
        description: "Final review for grammar, spelling, and punctuation errors",
      },
    }),
    db.categories.create({
      data: {
        name: "Content Writing",
        description: "Editing and refinement of web content, blogs, and articles",
      },
    }),
    db.categories.create({
      data: {
        name: "Legal Document Editing",
        description: "Specialized editing for legal documents and contracts",
      },
    }),
    db.categories.create({
      data: {
        name: "Manuscript Evaluation",
        description: "In-depth analysis and feedback on manuscript structure and content",
      },
    }),
  ]);

  const category = categories[0];

  // Create a post
  const post = await db.post.create({
    data: {
      title: "Need editing for my novel",
      description: "Looking for an experienced editor for my 80,000-word novel",
      budget: 500,
      duration: 30,
      status: PostStatus.open,
      deadline: faker.date.future(),
      categoryId: category.id,
      customerId: customer.id,
    },
  });

  // Create a bid
  await db.bid.create({
    data: {
      price: 450,
      comment: "I'd love to work on your novel. I have experience with fiction editing.",
      editorId: editor.id,
      postId: post.id,
    },
  });

  // Create a project
  const project = await db.project.create({
    data: {
      status: ProjectStatus.in_progress,
      customerId: customer.id,
      editorId: editor.id,
      postId: post.id,
    },
  });

  // Create a payment
  await db.payment.create({
    data: {
      amount: 450,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      customerId: customer.id,
      editorId: editor.id,
      projectId: project.id,
    },
  });

  // Create a document
  await db.document.create({
    data: {
      key: "novel-draft-1",
      name: "Novel Draft 1",
      description: "First draft of the novel",
      extension: "docx",
      bucket: "my-bucket",
      region: "us-west-2",
      imageUrl: "https://example.com/document-icon.png",
      type: DocumentType.SOURCE,
      projectId: project.id,
      customerId: customer.id,
    },
  });

  // Create a feedback
  await db.feedback.create({
    data: {
      rating: 5,
      comment: "Excellent editing work!",
      customerId: customer.id,
      projectId: project.id,
    },
  });

  console.log("Database has been seeded. 🌱");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
