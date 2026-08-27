class CatMember {
  final String membershipId;
  final String userId;
  final String name;
  final String email;

  CatMember({required this.membershipId, required this.userId, required this.name, required this.email});

  factory CatMember.fromJson(Map<String, dynamic> json) => CatMember(
        membershipId: json['membershipId'] as String,
        userId: json['userId'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
      );
}
