import type { WorkOrderBuildInfo } from "@/lib/work-orders-api"

export type InspectionDispatchBuildAssignment = {
  buildUuid: string
  buildName: string
  userUuid: string
}

export function extractInspectionDispatchBuilds(builds: WorkOrderBuildInfo[] | undefined): InspectionDispatchBuildAssignment[] {
  if (!Array.isArray(builds) || !builds.length) {
    return []
  }

  const seen = new Set<string>()

  return builds.flatMap((build, index) => {
    const buildUuid = toText(build.BuildUuid)

    if (!buildUuid || seen.has(buildUuid)) {
      return []
    }

    seen.add(buildUuid)

    return [{
      buildUuid,
      buildName: toText(build.BuildName, `建筑 ${index + 1}`),
      userUuid: "",
    }]
  })
}

export function applyInspectionDispatchDefaultUser(
  builds: InspectionDispatchBuildAssignment[],
  nextDefaultUserUuid: string,
  previousDefaultUserUuid: string,
) {
  return builds.map((build) => {
    if (!nextDefaultUserUuid) {
      return build
    }

    if (!build.userUuid || build.userUuid === previousDefaultUserUuid) {
      return {
        ...build,
        userUuid: nextDefaultUserUuid,
      }
    }

    return build
  })
}

export function buildInspectionDispatchPayloadGroups(builds: InspectionDispatchBuildAssignment[]) {
  const assignments = new Map<string, string[]>()

  for (const build of builds) {
    const userUuid = toText(build.userUuid)
    const buildUuid = toText(build.buildUuid)

    if (!userUuid || !buildUuid) {
      continue
    }

    const current = assignments.get(userUuid) ?? []

    if (!current.includes(buildUuid)) {
      current.push(buildUuid)
    }

    assignments.set(userUuid, current)
  }

  return Array.from(assignments.entries()).map(([userUuid, buildUuids]) => ({
    userUuid,
    buildUuids,
  }))
}

export function hasValidInspectionDispatchBuilds(builds: InspectionDispatchBuildAssignment[]) {
  return builds.length > 0 && builds.every(build => Boolean(toText(build.buildUuid)))
}

export function isInspectionDispatchComplete(builds: InspectionDispatchBuildAssignment[]) {
  return hasValidInspectionDispatchBuilds(builds)
    && builds.every(build => Boolean(toText(build.userUuid)))
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}
