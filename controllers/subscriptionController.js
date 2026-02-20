import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

// Fixed free plan limits - aligned values with comments
const FREE_PLAN_LIMITS = {
  service_listings: 5, // 5 free listings
  featured_listings: 0, // No featured listings in free plan
  lead_access: 20, // Can receive 20 leads
  portfolio_items: 3, // 3 portfolio items
  lead_creation: 10, // 10 free leads
  premium_search: 0, // No premium search
  seller_contact: 15, // 15 seller contacts
  saved_searches: 5, // 5 saved searches
};

// Enhanced usage limit check with better error handling
export const checkUsageLimit = async (
  userId,
  featureType,
  requiredCount = 1
) => {
  try {
    // Validate feature type
    if (!FREE_PLAN_LIMITS.hasOwnProperty(featureType)) {
      return {
        allowed: false,
        reason: `Invalid feature type: ${featureType}`,
      };
    }

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        status: "active",
      },
      include: {
        plan: true,
        usage: {
          where: {
            feature_type: featureType,
            reset_date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    // Free user handling
    if (!subscription) {
      const freeLimit = FREE_PLAN_LIMITS[featureType];

      const currentUsage = await prisma.subscriptionUsage.findFirst({
        where: {
          user_id: userId,
          feature_type: featureType,
          reset_date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          subscription_id: null, // Free user usage
        },
      });

      const usedCount = currentUsage ? currentUsage.usage_count : 0;

      if (freeLimit > 0 && usedCount + requiredCount > freeLimit) {
        return {
          allowed: false,
          reason: `Free plan limit exceeded for ${featureType.replace(
            "_",
            " "
          )}. Used: ${usedCount}, Limit: ${freeLimit}. Please upgrade your plan to continue.`,
          requiresUpgrade: true,
          used: usedCount,
          limit: freeLimit,
        };
      }

      return {
        allowed: true,
        used: usedCount,
        limit: freeLimit,
        isFreePlan: true,
        remaining: freeLimit - usedCount,
      };
    }

    // Paid subscription handling
    let planLimits = {};
    try {
      planLimits =
        typeof subscription.plan.limits === "string"
          ? JSON.parse(subscription.plan.limits)
          : subscription.plan.limits;
    } catch (error) {
      console.error("Error parsing plan limits:", error);
      return {
        allowed: false,
        reason: "Invalid subscription plan configuration",
      };
    }

    const currentUsage = subscription.usage.find(
      (u) => u.feature_type === featureType
    );
    const usedCount = currentUsage ? currentUsage.usage_count : 0;
    const limit = planLimits[featureType] || 0;

    // Unlimited feature (limit = 0)
    if (limit === 0) {
      return {
        allowed: true,
        used: usedCount,
        limit: 0, // Unlimited
        isFreePlan: false,
        remaining: Infinity,
      };
    }

    // Limited feature
    if (limit > 0 && usedCount + requiredCount > limit) {
      return {
        allowed: false,
        reason: `Usage limit exceeded for ${featureType.replace(
          "_",
          " "
        )}. Used: ${usedCount}, Limit: ${limit}. Please upgrade your plan for higher limits.`,
        requiresUpgrade: true,
        used: usedCount,
        limit: limit,
      };
    }

    return {
      allowed: true,
      used: usedCount,
      limit: limit,
      isFreePlan: false,
      remaining: limit - usedCount,
    };
  } catch (error) {
    console.error("Error in checkUsageLimit:", error);
    return {
      allowed: false,
      reason: "Error checking usage limits",
      error: error.message,
    };
  }
};

// Enhanced increment usage with rollback protection
export const incrementUsage = async (userId, featureType, count = 1) => {
  try {
    // Validate feature type
    if (!FREE_PLAN_LIMITS.hasOwnProperty(featureType)) {
      throw new Error(`Invalid feature type: ${featureType}`);
    }

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        status: "active",
      },
    });

    const currentMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    let usage;

    // Check limit before incrementing
    const usageCheck = await checkUsageLimit(userId, featureType, count);
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.reason);
    }

    if (subscription) {
      // Paid user - track with subscription
      const existingUsage = await prisma.subscriptionUsage.findFirst({
        where: {
          subscription_id: subscription.subscription_id,
          feature_type: featureType,
          reset_date: currentMonth,
        },
      });

      if (existingUsage) {
        usage = await prisma.subscriptionUsage.update({
          where: { usage_id: existingUsage.usage_id },
          data: { usage_count: { increment: count } },
        });
      } else {
        usage = await prisma.subscriptionUsage.create({
          data: {
            subscription_id: subscription.subscription_id,
            user_id: userId,
            feature_type: featureType,
            usage_count: count,
            reset_date: currentMonth,
          },
        });
      }
    } else {
      // Free user - track without subscription
      const existingUsage = await prisma.subscriptionUsage.findFirst({
        where: {
          user_id: userId,
          feature_type: featureType,
          reset_date: currentMonth,
          subscription_id: null,
        },
      });

      if (existingUsage) {
        usage = await prisma.subscriptionUsage.update({
          where: { usage_id: existingUsage.usage_id },
          data: { usage_count: { increment: count } },
        });
      } else {
        usage = await prisma.subscriptionUsage.create({
          data: {
            user_id: userId,
            feature_type: featureType,
            usage_count: count,
            reset_date: currentMonth,
            subscription_id: null,
          },
        });
      }
    }

    return usage;
  } catch (error) {
    console.error("Error in incrementUsage:", error);
    throw error;
  }
};

// NEW: Check multiple features at once
export const checkMultipleFeatures = async (userId, features) => {
  try {
    const results = {};

    for (const { featureType, requiredCount = 1 } of features) {
      const check = await checkUsageLimit(userId, featureType, requiredCount);
      results[featureType] = check;
    }

    return results;
  } catch (error) {
    console.error("Error checking multiple features:", error);
    throw error;
  }
};

// NEW: Get usage analytics
export const getUserUsageAnalytics = async (userId, months = 6) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const usageData = await prisma.subscriptionUsage.findMany({
      where: {
        user_id: userId,
        reset_date: { gte: startDate },
      },
      orderBy: { reset_date: "asc" },
    });

    // Group by month and feature
    const analytics = usageData.reduce((acc, usage) => {
      const month = usage.reset_date.toISOString().substring(0, 7);
      if (!acc[month]) acc[month] = {};
      acc[month][usage.feature_type] = usage.usage_count;
      return acc;
    }, {});

    return analytics;
  } catch (error) {
    console.error("Error fetching usage analytics:", error);
    throw error;
  }
};

// NEW: Check for usage alerts (90%+ usage)
export const checkUsageAlerts = async (userId) => {
  try {
    const subscription = await prisma.userSubscription.findFirst({
      where: { user_id: userId },
      include: {
        plan: true,
        usage: {
          where: {
            reset_date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    const alerts = [];

    if (!subscription) {
      // Free user alerts
      for (const [feature, limit] of Object.entries(FREE_PLAN_LIMITS)) {
        if (limit > 0) {
          const usage = await prisma.subscriptionUsage.findFirst({
            where: {
              user_id: userId,
              feature_type: feature,
              reset_date: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1
                ),
              },
              subscription_id: null,
            },
          });

          const used = usage ? usage.usage_count : 0;
          const percentage = (used / limit) * 100;

          if (percentage >= 80) {
            alerts.push({
              feature,
              used,
              limit,
              percentage: Math.round(percentage),
              severity:
                percentage >= 100
                  ? "error"
                  : percentage >= 90
                  ? "warning"
                  : "info",
              message:
                percentage >= 100
                  ? `You've exceeded your ${feature.replace("_", " ")} limit`
                  : `You've used ${Math.round(
                      percentage
                    )}% of your ${feature.replace("_", " ")} limit`,
            });
          }
        }
      }
    } else {
      // Paid user alerts
      const planLimits =
        typeof subscription.plan.limits === "string"
          ? JSON.parse(subscription.plan.limits)
          : subscription.plan.limits;

      for (const [feature, limit] of Object.entries(planLimits)) {
        if (limit > 0) {
          const usage = subscription.usage.find(
            (u) => u.feature_type === feature
          );
          const used = usage ? usage.usage_count : 0;
          const percentage = (used / limit) * 100;

          if (percentage >= 80) {
            alerts.push({
              feature,
              used,
              limit,
              percentage: Math.round(percentage),
              severity:
                percentage >= 100
                  ? "error"
                  : percentage >= 90
                  ? "warning"
                  : "info",
              message:
                percentage >= 100
                  ? `You've exceeded your ${feature.replace("_", " ")} limit`
                  : `You've used ${Math.round(
                      percentage
                    )}% of your ${feature.replace("_", " ")} limit`,
            });
          }
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error("Error checking usage alerts:", error);
    throw error;
  }
};

// Get all subscription plans
export const getSubscriptionPlans = async (req, res) => {
  try {
    const { plan_type } = req.query;

    const where = { is_active: true };
    if (plan_type) {
      where.OR = [{ plan_type }, { plan_type: "both" }];
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: [{ plan_type: "asc" }, { sort_order: "asc" }, { price: "asc" }],
    });

    // Parse JSON fields for frontend
    const parsedPlans = plans.map((plan) => ({
      ...plan,
      features:
        typeof plan.features === "string"
          ? JSON.parse(plan.features)
          : plan.features,
      limits:
        typeof plan.limits === "string" ? JSON.parse(plan.limits) : plan.limits,
    }));

    res.json({
      success: true,
      data: parsedPlans,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Enhanced get user subscription with analytics
export const getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const subscription = await prisma.userSubscription.findFirst({
      where: { user_id: userId },
      include: {
        plan: true,
        usage: {
          where: {
            reset_date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    // Get usage analytics
    const usageAnalytics = await getUserUsageAnalytics(userId, 3);
    const usageAlerts = await checkUsageAlerts(userId);

    if (!subscription) {
      // Return free user data
      const freeUsage = {};
      for (const [feature, limit] of Object.entries(FREE_PLAN_LIMITS)) {
        const usage = await prisma.subscriptionUsage.findFirst({
          where: {
            user_id: userId,
            feature_type: feature,
            reset_date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
            subscription_id: null,
          },
        });

        const used = usage ? usage.usage_count : 0;
        freeUsage[feature] = {
          used: used,
          limit: limit,
          remaining: limit === 0 ? Infinity : limit - used,
          percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
        };
      }

      return res.json({
        success: true,
        data: {
          subscription: null,
          isFreePlan: true,
          usage: freeUsage,
          analytics: usageAnalytics,
          alerts: usageAlerts,
          freePlanLimits: FREE_PLAN_LIMITS,
        },
      });
    }

    // Parse JSON fields safely
    let planLimits = {};
    try {
      planLimits =
        typeof subscription.plan.limits === "string"
          ? JSON.parse(subscription.plan.limits)
          : subscription.plan.limits;
    } catch (error) {
      console.error("Error parsing plan limits:", error);
      planLimits = {};
    }

    const usageMap = {};
    subscription.usage.forEach((u) => {
      usageMap[u.feature_type] = u.usage_count;
    });

    const usageDetails = {};
    Object.keys(planLimits).forEach((feature) => {
      const limit = planLimits[feature];
      const used = usageMap[feature] || 0;

      usageDetails[feature] = {
        used: used,
        limit: limit,
        remaining: limit === 0 ? Infinity : limit - used,
        percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
      };
    });

    res.json({
      success: true,
      data: {
        subscription: {
          ...subscription,
          plan: {
            ...subscription.plan,
            features:
              typeof subscription.plan.features === "string"
                ? JSON.parse(subscription.plan.features)
                : subscription.plan.features,
            limits: planLimits,
          },
        },
        usage: usageDetails,
        analytics: usageAnalytics,
        alerts: usageAlerts,
        isFreePlan: false,
      },
    });
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { plan_id } = req.body;

    // Check if user already has active PAID subscription
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        status: "active",
        plan: {
          price: {
            gt: 0, // Only block if they have an active PAID subscription
          },
        },
      },
      include: {
        plan: true,
      },
    });

    if (existingSubscription && existingSubscription.plan.price > 0) {
      return res.status(400).json({
        success: false,
        error:
          "User already has an active paid subscription. Please cancel your current plan first or contact support.",
      });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { plan_id: parseInt(plan_id) },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Subscription plan not found",
      });
    }

    // If user has a free plan subscription, cancel it first
    if (existingSubscription && existingSubscription.plan.price === 0) {
      await prisma.userSubscription.update({
        where: { subscription_id: existingSubscription.subscription_id },
        data: {
          status: "canceled",
          cancel_at_period_end: true,
        },
      });
    }

    // Calculate period end date
    const currentDate = new Date();
    const periodEnd = new Date(currentDate);

    switch (plan.billing_cycle) {
      case "monthly":
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case "quarterly":
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case "yearly":
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      case "lifetime":
        periodEnd.setFullYear(periodEnd.getFullYear() + 100);
        break;
    }

    const subscription = await prisma.userSubscription.create({
      data: {
        user_id: userId,
        plan_id: parseInt(plan_id),
        status: "active",
        current_period_start: currentDate,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        stripe_subscription_id: `test_sub_${Date.now()}`,
        stripe_customer_id: `test_cus_${Date.now()}`,
      },
      include: {
        plan: true,
      },
    });

    // Update user role and seller profile if needed
    if (plan.plan_type === "seller" || plan.plan_type === "both") {
      const updateData = {
        role: "seller",
      };

      // Only update sellerprofile if it exists and user is becoming a seller
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { user_id: userId },
      });

      if (sellerProfile) {
        updateData.sellerprofile = {
          update: {
            subscription_plan: "premium",
          },
        };
      }

      await prisma.user.update({
        where: { user_id: userId },
        data: updateData,
      });
    }

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        error: "User already has a subscription",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const subscription = await prisma.userSubscription.findFirst({
      where: { user_id: userId, status: "active" },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: "No active subscription found",
      });
    }

    // Store subscription info before deletion for response
    const subscriptionInfo = {
      ...subscription,
      plan_name: subscription.plan.name,
      plan_price: subscription.plan.price,
    };

    // Completely delete the subscription
    await prisma.userSubscription.delete({
      where: { subscription_id: subscription.subscription_id },
    });

    // Reset user role if needed (only if they had a paid seller plan)
    if (
      subscription.plan.plan_type === "seller" ||
      subscription.plan.plan_type === "both"
    ) {
      await prisma.user.update({
        where: { user_id: userId },
        data: { role: "buyer" }, // Default role
      });

      // Also reset seller profile subscription plan if exists
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { user_id: userId },
      });

      if (sellerProfile) {
        await prisma.sellerProfile.update({
          where: { user_id: userId },
          data: { subscription_plan: "free" },
        });
      }
    }

    res.json({
      success: true,
      message: "Subscription deleted successfully",
      data: {
        deleted_subscription: subscriptionInfo,
        deleted_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);

    // Handle specific Prisma errors
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Subscription not found or already deleted",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// NEW: Get free plan info
export const getFreePlanInfo = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        limits: FREE_PLAN_LIMITS,
        features: Object.keys(FREE_PLAN_LIMITS).map((feature) => ({
          name: feature,
          limit: FREE_PLAN_LIMITS[feature],
          description: getFeatureDescription(feature),
        })),
      },
    });
  } catch (error) {
    console.error("Error getting free plan info:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// NEW: Check multiple features endpoint
export const checkMultipleFeaturesEndpoint = async (req, res) => {
  try {
    const { features } = req.body; // [{featureType, requiredCount}]

    if (!Array.isArray(features)) {
      return res.status(400).json({
        success: false,
        error: "Features must be an array",
      });
    }

    const results = await checkMultipleFeatures(req.user.user_id, features);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error checking multiple features:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// NEW: Get usage alerts endpoint
export const getUsageAlerts = async (req, res) => {
  try {
    const alerts = await checkUsageAlerts(req.user.user_id);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error getting usage alerts:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

// Helper function for feature descriptions
const getFeatureDescription = (feature) => {
  const descriptions = {
    service_listings: "Create service listings to showcase your offerings",
    featured_listings: "Feature your listings for better visibility",
    lead_access: "Receive and view leads from potential customers",
    portfolio_items: "Add items to your portfolio showcase",
    lead_creation: "Send inquiries and leads to service providers",
    premium_search: "Access advanced search filters and analytics",
    seller_contact: "Contact sellers directly for inquiries",
    saved_searches: "Save and manage your search queries",
  };

  return descriptions[feature] || "Feature access";
};

// Enhanced middleware to check feature access
export const checkFeatureAccess = (featureType, requiredCount = 1) => {
  return async (req, res, next) => {
    try {
      const usageCheck = await checkUsageLimit(
        req.user.user_id,
        featureType,
        requiredCount
      );

      if (!usageCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: usageCheck.reason,
          code: "USAGE_LIMIT_EXCEEDED",
          data: {
            used: usageCheck.used,
            limit: usageCheck.limit,
            requiresUpgrade: usageCheck.requiresUpgrade,
          },
        });
      }

      req.usageCheck = usageCheck;
      next();
    } catch (error) {
      console.error("Error checking feature access:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };
};

// NEW: Middleware to check multiple features
export const checkMultipleFeaturesAccess = (features) => {
  return async (req, res, next) => {
    try {
      const results = await checkMultipleFeatures(req.user.user_id, features);

      const deniedFeatures = Object.entries(results)
        .filter(([_, check]) => !check.allowed)
        .map(([feature, check]) => ({ feature, reason: check.reason }));

      if (deniedFeatures.length > 0) {
        return res.status(403).json({
          success: false,
          error: "Feature access denied",
          code: "USAGE_LIMIT_EXCEEDED",
          deniedFeatures: deniedFeatures,
        });
      }
      req.usageChecks = results;
      next();
    } catch (error) {
      console.error("Error checking multiple features access:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };
};
