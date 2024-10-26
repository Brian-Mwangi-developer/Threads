"use server"

import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params{
    text:string,
    author:string,
    communityId:string| null,
    path:string,
}

export async function createThread({text,author,communityId, path}:Params){
    try{
        connectToDB();
    const createdThread = await Thread.create({
        text,
        author,
        community:null,
    })
    //Update User Model
    await User.findByIdAndUpdate(author,{
        $push:{threads:createdThread._id}
    })

    revalidatePath(path)

    }catch(error:any){
        throw new Error(`Failed to create thread: ${error.message}`)
    }
}


export async function fetchPosts(pageNumber =1, pageSize = 20){
    connectToDB();
    //Calculate the Number of Posts to Skip
    const skipAmount = (pageNumber - 1) * pageSize
    //Fetch the Posts that have no Parents (top-levels threads...)
    const postsQuery =Thread.find({parentId:{$in:[null, undefined]}})
    .sort({createdAt:"desc"})
    .skip(skipAmount)
    .limit(pageSize)
    .populate({path:"author", model:User})
    .populate({
        path:'children',
        populate:{
            path:"author",
            model:User,
            select:"id name parentId image"
        }
    })

    const totalPostsCount = await Thread.countDocuments({parentId:{$in:[null, undefined]}})

    const posts = await postsQuery.exec();
    const isNext = totalPostsCount > skipAmount + posts.length;

    return {posts, isNext}
}


export async function fetchThreadById(id:string){
    connectToDB();
    //TODO:Populate Community
    try{
        const thread = await Thread.findById(id).
         populate({
            path:"author",
            model:User,
            select:"id name parentId image"
            })
         .populate({
            path:"children",
            populate:[
                {
                    path:"author",
                    model:User,
                    select:"_id id name parentId image"
                },{
                    path:"children",
                    model:Thread,
                    populate:{
                        path:"author",
                        model:User,
                        select:"_id id name parentId Image"
                    }
                }
            ]
         }).exec();
        return thread
    }catch(error:any){
        throw new Error(`Failed to fetch thread: ${error.message}`)
    }
}

export async function addCommentToThread(
    threadId:string,
    commentText:string,
    userId:string,
    path:string
){
    connectToDB();

    try{
        //find the Original Thread By Id
        const originalThread = await Thread.findById(threadId)
        if(!originalThread) throw new Error("Thread Not Found");

        //Create a new thread with the Comment Text
        const commentThread = new Thread({
            text:commentText,
            author:userId,
            parentId:threadId,
        })

        //save the comment to database
        const savedCommentThread = await commentThread.save();

        //Update the Original Thread Model to include comment
        originalThread.children.push(savedCommentThread._id);
        await originalThread.save();     
        revalidatePath(path);

    }catch(error:any){
        throw new Error(`Failed to add comment: ${error.message}`)
    }
}