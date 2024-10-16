import { type ActionFunctionArgs, json } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { badRequest } from "~/utils/misc.server";

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1, "Comment is required"),
  projectId: z.string().min(1, "Project ID is required"),
});

export type FeedbackActionData =
  | { success: true; feedback: any }
  | { success: false; message: string };

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const result = feedbackSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return badRequest<FeedbackActionData>({
      success: false,
      message: "Invalid form data",
    });
  }

  const { rating, comment, projectId } = result.data;

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { feedback: true },
    });

    if (!project) {
      return badRequest<FeedbackActionData>({ success: false, message: "Project not found" });
    }

    if (project.customerId !== userId) {
      return badRequest<FeedbackActionData>({
        success: false,
        message: "Unauthorized to leave feedback for this project",
      });
    }

    if (project.feedback.length > 0) {
      return badRequest<FeedbackActionData>({
        success: false,
        message: "Feedback has already been submitted for this project",
      });
    }

    const feedback = await db.feedback.create({
      data: {
        rating,
        comment,
        projectId,
        customerId: userId,
      },
    });

    return json<FeedbackActionData>({ success: true, feedback });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return badRequest<FeedbackActionData>({
      success: false,
      message: "An error occurred while submitting feedback",
    });
  }
}
