import { Repository } from "sourced-repo-typeorm";
import { ToDo } from "../models/ToDo.js";

const repository = new Repository(ToDo);

export const todoRepository = repository;
