export type GeneratedSchedule = {
    mainTasks: MainTask[];
    subtasks: SubTask[];
};
export type MainTask = {
    name: string;
    priority: 'low' | 'medium' | 'high';
};
export type SubTask = {
    description: string;
    time: number;
    mainTaskName: string;
};
//# sourceMappingURL=schedule.d.ts.map