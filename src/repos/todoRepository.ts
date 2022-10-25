import { Repository } from "sourced-repo-typeorm";
import { ToDo } from "../models/ToDo.js";
import { QueuedRepo } from "sourced-queued-repo-promise";

export const repository = QueuedRepo(new Repository(ToDo));
