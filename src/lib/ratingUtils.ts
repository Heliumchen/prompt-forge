import { TestSet } from './testSetStorage';

/**
 * Calculates the average rating for all rated test results of a specific version
 * @param testSet - The test set containing test cases
 * @param versionIdentifier - The version identifier to calculate average for
 * @returns Average rating (1 decimal place) or null if no ratings exist
 */
export const calculateAverageRating = (
  testSet: TestSet | null | undefined,
  versionIdentifier: string | undefined
): number | null => {
  if (!testSet || !versionIdentifier) {
    return null;
  }

  const ratingsWithValues = testSet.testCases
    .map(testCase => testCase.results[versionIdentifier]?.rating)
    .filter((rating): rating is number => rating !== undefined && rating !== null);

  if (ratingsWithValues.length === 0) {
    return null;
  }

  const sum = ratingsWithValues.reduce((acc, rating) => acc + rating, 0);
  const average = sum / ratingsWithValues.length;

  // Round to 1 decimal place
  return Math.round(average * 10) / 10;
};

/**
 * Gets the count of rated and total test cases for a version
 * @param testSet - The test set containing test cases
 * @param versionIdentifier - The version identifier to count ratings for
 * @returns Object with ratedCount and totalCount
 */
export const getRatingCount = (
  testSet: TestSet | null | undefined,
  versionIdentifier: string | undefined
): { ratedCount: number; totalCount: number } => {
  if (!testSet || !versionIdentifier) {
    return { ratedCount: 0, totalCount: 0 };
  }

  const totalCount = testSet.testCases.filter(
    testCase => testCase.results[versionIdentifier] !== undefined
  ).length;

  const ratedCount = testSet.testCases.filter(
    testCase => testCase.results[versionIdentifier]?.rating !== undefined
  ).length;

  return { ratedCount, totalCount };
};

/**
 * Compares ratings between primary and comparison versions
 * @param testSet - The test set containing test cases
 * @param primaryVersionId - The primary version identifier
 * @param comparisonVersionId - The comparison version identifier
 * @returns Object with counts for better, worse, tied, and unrated
 */
export const compareRatings = (
  testSet: TestSet | null | undefined,
  primaryVersionId: string | undefined,
  comparisonVersionId: string | undefined
): {
  primaryBetter: number;
  comparisonBetter: number;
  tied: number;
  unrated: number;
} => {
  if (!testSet || !primaryVersionId || !comparisonVersionId) {
    return { primaryBetter: 0, comparisonBetter: 0, tied: 0, unrated: 0 };
  }

  let primaryBetter = 0;
  let comparisonBetter = 0;
  let tied = 0;
  let unrated = 0;

  testSet.testCases.forEach(testCase => {
    const primaryRating = testCase.results[primaryVersionId]?.rating;
    const comparisonRating = testCase.results[comparisonVersionId]?.rating;

    if (primaryRating !== undefined && comparisonRating !== undefined) {
      if (primaryRating > comparisonRating) {
        primaryBetter++;
      } else if (comparisonRating > primaryRating) {
        comparisonBetter++;
      } else {
        tied++;
      }
    } else {
      unrated++;
    }
  });

  return { primaryBetter, comparisonBetter, tied, unrated };
};
