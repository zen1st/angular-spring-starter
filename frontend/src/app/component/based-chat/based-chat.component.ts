import { Component, OnInit, OnDestroy, AfterViewChecked, ChangeDetectorRef, ViewEncapsulation, ViewChild, Inject, ElementRef } from '@angular/core';
import {MediaMatcher} from '@angular/cdk/layout';
import {Router, RouterOutlet , ActivationStart  } from '@angular/router'
import { Subscription } from 'rxjs';
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import {
  UserService,
  AuthService,
  ChatRoomService
} from 'app/service';
import { AdminGuard } from 'app/guard/index';
import { DOCUMENT } from '@angular/platform-browser';
declare var $:any;

import { MatDialog } from '@angular/material';
import { ChatConfirmDialogComponent } from 'app/component/based-chat/chat-confirm-dialog/';

@Component({
  selector: 'app-based-chat',
  templateUrl: './based-chat.component.html',
  styleUrls: ['./based-chat.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class BasedChatComponent implements OnInit {
	mobileQuery: MediaQueryList;
	
	private _mobileQueryListener: () => void;

	@ViewChild('rnav') rnav:any;
	@ViewChild(RouterOutlet) outlet: RouterOutlet;
	
	private chatRooms : any[] = [];
	/*
	private chatRooms = [
	{
		"name":"No Chat", 
		"chatMessages":[]
	}];
		
	/*
	private chatRooms = [
		{
			"id":2,
			"name":"chat2", 
			"chatMessages":
			[
				{
					"username":"u1",
					"message":"m1"
				},
				{
					"username":"u2",
					"message":"m2"
				},
				{
					"username":"u2",
					"message":"m3"
				},
				{
					"username":"u2",
					"message":"m4"
				},
				{
					"username":"u2",
					"message":"m5"
				},
				{
					"username":"u2",
					"message":"m6"
				},
				{
					"username":"u2",
					"message":"m7"
				},
				{
					"username":"u2",
					"message":"m8"
				},
				{
					"username":"u2",
					"message":"m9"
				},
				{
					"username":"u2",
					"message":"m10"
				},
				{
					"username":"u2",
					"message":"m11"
				},
				{
					"username":"u2",
					"message":"m12 Chat 1ddddddddddddddddddddddddddddddddddddddddddddddddddd dfdfdfdfdfdfd dfdfdfdfdfd dfdfd"
				}
				
			]
		},
		{
			"id":1,
			"name":"Chat 1ddddddddddddddddddddddddddddddddddddddddddddddddddd dfdfdfdfdfdfd dfdfdfdfdfd dfdfd", 
			"chatMessages":
			[
				{
					"username":"u1",
					"message":"m1"
				},
				{
					"username":"u2",
					"message":"m2"
				}
			]
		}];
	*/
	
	private currentChatIndex = 0;
	
	//@ViewChild('scrollMe') private myScrollContainer: ElementRef;
	
	messages: any[] = [];
    subscription: Subscription;
	
	private serverUrl = 'http://localhost:8080/api/websocket'
	private ws;
	private stompClient;
	chatSubscriptions: any[] = [];
	
	constructor(changeDetectorRef: ChangeDetectorRef, 
		media: MediaMatcher, 
		@Inject(DOCUMENT) private document,
		private router : Router,
		private authService : AuthService,
		private userService : UserService,
		private adminGuard : AdminGuard,
		private chatRoomService : ChatRoomService,
		public dialog: MatDialog) {
			
			
		this.mobileQuery = media.matchMedia('(max-width: 600px)');
		this._mobileQueryListener = () => changeDetectorRef.detectChanges();
		this.mobileQuery.addListener(this._mobileQueryListener);
		
		//this.ws = new SockJS(this.serverUrl);
		//this.stompClient = Stomp.over(this.ws);
		
		//this.initializeWebSocketNotificationConnection();
				
		this.chatRoomService.getMine().subscribe(res => {
			this.chatRooms = res;
			//this.initializeWebSocketChatConnection();
			this.initializeWebSocketConnection();
		},
		err=>{
			this.initializeWebSocketConnection();
		});
		
		
        this.subscription = this.chatRoomService.getMessage().subscribe(message => {
			if (message) {
				this.chatRooms = message;
				//this.initializeWebSocketChatConnection();
				this.stompClient.disconnect(function() {});
				this.initializeWebSocketConnection();
			} else {
			// clear messages when empty message received
			//this.messages = [];
			}
		});
	}

	ngOnInit() {
		this.router.events.subscribe(e => {
			//if (e instanceof ActivationStart && e.snapshot.outlet === "chats") this.outlet.deactivate();
			if (e instanceof ActivationStart)this.outlet.deactivate();
		});
		
	}
  
	ngOnDestroy(): void {
		this.mobileQuery.removeListener(this._mobileQueryListener);
	}
  
    userName() {
		const user = this.userService.currentUser;
		//return user.firstName + ' ' + user.lastName;
		return user.username;
	}
  
	logout() {
		this.authService.logout().subscribe(res => {
		  this.router.navigate(['/']);
		});
	}

	clickChat(i){
		this.currentChatIndex = i;
		//this.scrollToBottom();
	}

	show(str?: string){
		//console.log(str);
		//console.log(this.chatRooms[this.currentChatIndex][str]);
		if(this.chatRooms.length>0){
			
			if(!str){
				return true;
			}
			
			if(this.chatRooms[this.currentChatIndex][str]){
				return (this.chatRooms[this.currentChatIndex][str].length>0);
			}
			
		}
		return false;
	}
	
		
	
	initializeWebSocketConnection(){
		let ws = new SockJS(this.serverUrl);
		this.stompClient = Stomp.over(ws);
		
		let that = this;
		this.stompClient.connect({}, function(frame) {
			let url = "/notification/" + that.userName();
				
			that.stompClient.subscribe(url, (message) => {
				if(message.body) {
					let body = JSON.parse(message.body);
					let index = that.chatRooms.findIndex(x => x.id == body.roomId);
					
					if(body.type=="REQUEST"){
						//console.log(index);
						that.chatRooms[index]['pendingUsers'].push(body.user);
					}
					else if(body.type=="ACCEPT"){
						that.chatRooms.push(body.chatRoom);
						
						if(index<0){
							that.stompClient.disconnect(function() {});
							that.initializeWebSocketConnection();
						}
					}
				}
			});
			
			for(var k in that.chatRooms){
				let url = "/chat/" + that.chatRooms[k]["id"];
				
				let chatSubscription = that.stompClient.subscribe(url, (message) => {
					if(message.body) {
						let body = JSON.parse(message.body);
						let index = that.chatRooms.findIndex(x => x.id == body.roomId);
						
						if(body.type=="ACCEPT"){
							//everybody in chat
							that.chatRooms[index]['members'].push(body.user);
							
							//chat creator
							if(that.chatRooms[index]['createdBy'] == that.userName()){
								that.chatRooms[index]['pendingUsers'] = that.chatRooms[index]['pendingUsers'].filter(v => v !== body.user);
								that.chatRooms[index]['blockedUsers'] = that.chatRooms[index]['blockedUsers'].filter(v => v !== body.user);
							}
							
						}
						else if(body.type=="BLOCK"){
							
							//everybody in chat
							that.chatRooms[index]['members'] = that.chatRooms[index]['members'].filter(v => v !== body.user);
							
							//chat creator
							if(that.chatRooms[index]['createdBy'] == that.userName()){
								that.chatRooms[index]['pendingUsers'] = that.chatRooms[index]['pendingUsers'].filter(v => v !== body.user);
								that.chatRooms[index]['blockedUsers'].push(body.user);
							}
							
							//blocked user
							if(body.user == that.userName()){
								that.chatRooms.splice(index, 1);
								if(index==that.currentChatIndex){
									that.currentChatIndex=0;
								}
								that.stompClient.disconnect(function() {});
								that.initializeWebSocketConnection();
							}
							
						}
						else if(body.type=="CHAT"){
							if(!that.chatRooms[index].chatMessages){
								that.chatRooms[index].chatMessages = [];
							}
			
							that.chatRooms[index].chatMessages.push(body);
						}
						
					}
				});
				
				//console.log(chatSubscription);
				
				that.chatSubscriptions.push(chatSubscription);
				
			}

		});
		
		//console.log(that.chatSubscriptions);
	}
	
	initializeWebSocketNotificationConnection(){
		let ws = new SockJS(this.serverUrl);
		this.stompClient = Stomp.over(ws);
		
		//this.ws = new SockJS(this.serverUrl);
		//this.stompClient = Stomp.over(this.ws);
		
		let that = this;
		this.stompClient.connect({}, function(frame) {
			let url = "/notification/" + that.userName();
				
			that.stompClient.subscribe(url, (message) => {
				if(message.body) {
					let body = JSON.parse(message.body);
					let index = that.chatRooms.findIndex(x => x.id == body.roomId);
					if(body.type=="REQUEST"){
						//console.log(index);
						that.chatRooms[index]['pendingUsers'].push(body.user);
					}
					else if(body.type=="ACCEPT"){
						that.chatRooms.push(body.chatRoom);
					}
					else if(body.type=="BLOCK"){
						if(body.user == that.userName() && index==that.currentChatIndex){
							that.chatRooms.splice(index, 1);
							that.currentChatIndex=0;
						}
					}
				}
			});

		});
		
		//console.log(that.chatSubscriptions);
	}

	initializeWebSocketChatConnection(){
		//let ws = new SockJS(this.serverUrl);
		//this.stompClient = Stomp.over(ws);
		let that = this;
		this.stompClient.connect({}, function(frame) {
			
			for(var k in that.chatRooms){
				let url = "/chat/" + that.chatRooms[k]["id"];
				
				let chatSubscription = that.stompClient.subscribe(url, (message) => {
					if(message.body) {
						let body = JSON.parse(message.body);
						let index = that.chatRooms.findIndex(x => x.id == body.roomId);
						
						if(body.type=="ACCEPT"){
							//console.log(index);
							that.chatRooms[index]['members'].push(body.user);
							
							//chat creator
							if(that.chatRooms[index]['createdBy'] == that.userName()){
								that.chatRooms[index]['pendingUsers'] = that.chatRooms[index]['pendingUsers'].filter(v => v !== body.user);
								that.chatRooms[index]['blockedUsers'] = that.chatRooms[index]['blockedUsers'].filter(v => v !== body.user);
							}
							
						}
						else if(body.type=="BLOCK"){
							
							//everybody in chat
							that.chatRooms[index]['members'] = that.chatRooms[index]['members'].filter(v => v !== body.user);
							
							//chat creator
							if(that.chatRooms[index]['createdBy'] == that.userName()){
								that.chatRooms[index]['pendingUsers'] = that.chatRooms[index]['pendingUsers'].filter(v => v !== body.user);
								that.chatRooms[index]['blockedUsers'].push(body.user);
							}
							
							//blocked user
							if(body.user == that.userName()){
								that.chatRooms.splice(index, 1);
								if(index==that.currentChatIndex){	
									that.currentChatIndex=0;
								}
							}
							
						}
						
					}
				});
				
				//console.log(chatSubscription);
				
				that.chatSubscriptions.push(chatSubscription);
				//subscription.unsubscribe();
				
			}

		});
		
		//console.log(that.chatSubscriptions);
	}
	
	accept(user){
		const dialogRef = this.dialog.open(ChatConfirmDialogComponent, {
			data: {action: "accept", chatMessage:{roomId:this.chatRooms[this.currentChatIndex].id, user:user}}
		});
		
		dialogRef.afterClosed()
        .subscribe(
			data => {
				//console.log(data);
				
				if(data && data.roomId){
					//console.log(data.id);
					let index = this.chatRooms.findIndex(x => x.id == data.roomId);
					//this.data[index].pendingUsers.push();
					//console.log(this.data);
				}
			}
		);
	}
	
	block(user){
		const dialogRef = this.dialog.open(ChatConfirmDialogComponent, {
			data: {action: "block", chatMessage:{roomId:this.chatRooms[this.currentChatIndex].id, user:user}}
		});
	}
	
	unblock(user){
		const dialogRef = this.dialog.open(ChatConfirmDialogComponent, {
			data: {action: "unblock", chatMessage:{roomId:this.chatRooms[this.currentChatIndex].id, user:user}}
		});
	}
	
	leave(roomId){
		const dialogRef = this.dialog.open(ChatConfirmDialogComponent, {
			data: {action: "leave", chatMessage:{roomId:this.chatRooms[this.currentChatIndex].id}}
		});
	}
	
	sendMessage(message){
		
		if(message){
			let msg = {
			  'user' : this.userService.currentUser.username,
			  'roomId' : this.chatRooms[this.currentChatIndex]["id"],
			  'message' : message
			};

			//this.stompClient.send("/api/websocket/send/message" , {}, JSON.stringify(msg));
			this.stompClient.send("/api/websocket/chat/sendMessage/"+this.chatRooms[this.currentChatIndex]["id"] , {}, JSON.stringify(msg));
			$('.message-input input').val('');
		}
	}
	
	/*
	ngAfterViewChecked() {        
		this.scrollToBottom();	
    } 

    scrollToBottom(): void {
        try {
            this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
        } catch(err) { }                 
    }*/
}